import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim();

  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid resume id." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to manage resumes." }, { status: 401 });
  }

  // Verify ownership first: only the owner's row is visible thanks to RLS + user_id filter.
  const { data: row, error: fetchError } = await supabase
    .from("resumes")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  // Delete the PDF from the private bucket before removing the row.
  if (row.storage_path) {
    const { error: storageError } = await supabase.storage.from("resumes").remove([row.storage_path]);

    // Tolerate an already-missing object so orphaned rows can still be cleaned up.
    if (storageError && !/not found|does not exist|no such/i.test(storageError.message)) {
      return NextResponse.json({ error: `Could not delete the stored PDF: ${storageError.message}` }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);

  if (deleteError) {
    // Report honestly: the Storage object may already be gone while the row remains.
    return NextResponse.json(
      { error: `Stored file removed but the resume record could not be deleted: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id });
}
