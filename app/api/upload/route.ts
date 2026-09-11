import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Upload endpoint ready. Connect Supabase Storage and resume parsing to enable file uploads.",
    status: "stub"
  });
}
