import { NextResponse } from "next/server";

import { resumeToCandidate } from "@/lib/resume-profile";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();

  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid resume id." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view resumes." }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("resumes")
    .select("id, file_name, storage_path, extracted_text, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  return NextResponse.json({ candidate: resumeToCandidate(row) });
}
