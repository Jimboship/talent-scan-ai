import { NextResponse } from "next/server";

import { createResumeEmbedding, toVectorLiteral } from "@/lib/embeddings";
import { extractPdfText } from "@/lib/pdf-text";
import { extractCandidateProfile, resumeToCandidate } from "@/lib/resume-profile";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RESUMES = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to upload resumes." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "No PDF files were provided." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: `Upload at most ${MAX_FILES_PER_REQUEST} PDFs at a time.` }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const remaining = MAX_RESUMES - (count ?? 0);
  if (remaining <= 0) {
    return NextResponse.json({ error: "You have reached the 500 resume limit." }, { status: 400 });
  }

  const accepted = files.slice(0, remaining);
  const candidates = [];
  const errors: string[] = [];

  for (const file of accepted) {
    try {
      if (!isPdf(file)) {
        throw new Error(`${file.name} is not a PDF.`);
      }

      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`${file.name} is larger than 10MB.`);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const extractedText = await extractPdfText(bytes);

      if (!extractedText) {
        throw new Error(`${file.name} did not contain extractable text.`);
      }

      const profile = extractCandidateProfile(extractedText, file.name);
      const embeddingInput = [profile.name, profile.skills.join(", "), profile.experience, extractedText]
        .filter(Boolean)
        .join("\n");
      const embedding = await createResumeEmbedding(embeddingInput);

      const safeName = file.name.replace(/\s+/g, "-");
      const filePath = `${user.id}/${Date.now()}-${candidates.length}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          extracted_text: extractedText,
          embedding: toVectorLiteral(embedding)
        })
        .select("id, file_name, extracted_text, created_at")
        .single();

      if (insertError || !inserted) {
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError ?? new Error(`Unable to save ${file.name}.`);
      }

      candidates.push(resumeToCandidate(inserted));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unable to process ${file.name}.`);
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: errors[0] ?? "Unable to upload resumes.", errors }, { status: 422 });
  }

  return NextResponse.json({
    candidates,
    errors,
    skipped: files.length - accepted.length
  });
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
