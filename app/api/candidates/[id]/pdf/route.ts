import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 10 minutes: long enough to read the PDF, short enough to stay secure.
const SIGNED_URL_SECONDS = 600;

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

  // Verify ownership first: RLS plus an explicit user_id filter (defense in depth).
  const { data: row, error } = await supabase
    .from("resumes")
    .select("id, file_name, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row?.storage_path) {
    return NextResponse.json({ error: "Resume PDF is unavailable." }, { status: 404 });
  }

  const { data, error: signError } = await supabase.storage
    .from("resumes")
    .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);

  if (signError || !data?.signedUrl) {
    return NextResponse.json(
      { error: signError?.message ?? "Could not generate a secure PDF link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl, fileName: row.file_name, expiresIn: SIGNED_URL_SECONDS });
}
