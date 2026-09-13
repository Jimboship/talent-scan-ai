import { NextResponse } from "next/server";
import { z } from "zod";

import { createResumeEmbedding, toVectorLiteral } from "@/lib/embeddings";
import { extractCandidateProfile } from "@/lib/resume-profile";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RESULTS = 10;

const searchBodySchema = z.object({
  query: z.string().trim().min(1, "Enter a search query.").max(2000, "Search query is too long.")
});

const matchRowSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  extracted_text: z.string().nullable(),
  created_at: z.string(),
  similarity: z.number()
});

const matchRowsSchema = z.array(matchRowSchema);

type MatchResumesRow = z.infer<typeof matchRowSchema>;

export type SearchApiResult = {
  id: string;
  file_name: string;
  name: string;
  skills: string[];
  experience: string;
  created_at?: string;
  createdAt?: string;
  similarity: number;
};

function toSimilarityPercent(similarity: number) {
  if (!Number.isFinite(similarity)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
}

export async function POST(request: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON with a query field." }, { status: 400 });
  }

  const parsed = searchBodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a search query." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to search resumes." }, { status: 401 });
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await createResumeEmbedding(parsed.data.query);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a search embedding.";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  let matches: MatchResumesRow[];
  try {
    const { data, error } = await supabase.rpc("match_resumes", {
      query_embedding: toVectorLiteral(queryEmbedding),
      match_count: MAX_RESULTS
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsedMatches = matchRowsSchema.safeParse(data);
    if (!parsedMatches.success) {
      return NextResponse.json({ error: "Search returned an unexpected result shape." }, { status: 500 });
    }

    matches = parsedMatches.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search resumes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const results: SearchApiResult[] = matches.slice(0, MAX_RESULTS).map((row) => {
    const profile = extractCandidateProfile(row.extracted_text ?? "", row.file_name);

    return {
      id: row.id,
      file_name: row.file_name,
      name: profile.name,
      skills: profile.skills,
      experience: profile.experience,
      created_at: row.created_at,
      createdAt: row.created_at,
      similarity: toSimilarityPercent(row.similarity)
    };
  });

  return NextResponse.json({ results });
}

