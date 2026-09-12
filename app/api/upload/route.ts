import { NextResponse } from "next/server";

import { extractPdfText } from "@/lib/pdf-text";
import { resumeToCandidate } from "@/lib/resume-profile";
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Unable to read uploaded files." }, { status: 400 });
  }

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
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const remaining = MAX_RESUMES - (count ?? 0);
  if (remaining <= 0) {
    return NextResponse.json({ error: "You have reached the 500 resume limit." }, { status: 400 });
  }

  const accepted = files.slice(0, remaining);
  type UploadResult = { fileName: string; candidate: ReturnType<typeof resumeToCandidate> | null; error: string | null };
  const results: UploadResult[] = [];
  const candidates: ReturnType<typeof resumeToCandidate>[] = [];
  const errors: string[] = [];

  // Prevent duplicate file names for this user within this batch + already stored.
  const seenInBatch = new Set<string>();
  const acceptedNames = accepted.map((file) => file.name);
  const { data: existingRows } = await supabase
    .from("resumes")
    .select("file_name")
    .eq("user_id", user.id)
    .in("file_name", acceptedNames);
  const existingNames = new Set((existingRows ?? []).map((row) => row.file_name));

  for (const file of accepted) {
    const normalizedName = file.name.trim();
    try {
      if (!isPdf(file)) {
        throw new Error(`${file.name} is not a PDF.`);
      }

      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`${file.name} is larger than 10MB.`);
      }

      const lowerName = normalizedName.toLowerCase();
      if (seenInBatch.has(lowerName)) {
        throw new Error(`${file.name} was already included in this upload.`);
      }
      seenInBatch.add(lowerName);

      if (existingNames.has(normalizedName)) {
        throw new Error(`${file.name} has already been uploaded.`);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      // Best-effort text extraction: storage must succeed even if a PDF is scanned/image-only.
      // Embeddings are intentionally deferred (stored as null) until semantic search is implemented.
      let extractedText: string | null = null;
      try {
        const text = await extractPdfText(bytes);
        extractedText = text && text.trim().length > 0 ? text : null;
      } catch {
        extractedText = null;
      }

      const safeName = normalizedName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 180) || "resume.pdf";
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filePath = `${user.id}/${uniqueSuffix}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false
      });

      if (uploadError) {
        throw new Error(`${file.name}: ${uploadError.message}`);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: normalizedName,
          storage_path: filePath,
          extracted_text: extractedText,
          embedding: null
        })
        .select("id, file_name, storage_path, extracted_text, created_at")
        .single();

      if (insertError || !inserted) {
        // Roll back the stored object so Storage and the database stay consistent.
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError ?? new Error(`Unable to save ${file.name}.`);
      }

      existingNames.add(normalizedName);
      const candidate = resumeToCandidate(inserted);
      candidates.push(candidate);
      results.push({ fileName: file.name, candidate, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to process ${file.name}.`;
      errors.push(message);
      results.push({ fileName: file.name, candidate: null, error: message });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: errors[0] ?? "Unable to upload resumes.", errors, results }, { status: 422 });
  }

  return NextResponse.json({
    candidates,
    results,
    errors,
    skipped: files.length - accepted.length
  });
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
