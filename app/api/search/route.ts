import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

const fallbackResults = [
  { name: "Aisha Carter", score: 96, role: "Senior React Engineer" },
  { name: "Mateo Ruiz", score: 92, role: "Frontend Platform Engineer" },
  { name: "Priya Nair", score: 89, role: "AI Product Engineer" },
  { name: "Leo Park", score: 87, role: "Full Stack Developer" },
  { name: "Nia Brooks", score: 84, role: "Payments Engineer" },
  { name: "Daniel Kim", score: 82, role: "React Native Engineer" },
  { name: "Sara Ahmed", score: 80, role: "Engineering Manager" },
  { name: "Omar Hassan", score: 78, role: "Design Systems Engineer" },
  { name: "Lena Nguyen", score: 76, role: "Senior Frontend Engineer" },
  { name: "Noah Wright", score: 74, role: "Product Engineer" }
];

function calculateScore(query: string, candidateText: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return 100;
  }

  const queryTokens = normalizedQuery.split(/\s+/);
  const candidateTokens = candidateText.toLowerCase().split(/\s+/);
  const overlapping = queryTokens.filter((token) => candidateTokens.includes(token)).length;

  return Math.min(99, Math.max(40, Math.round((overlapping / Math.max(queryTokens.length, 1)) * 100)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "React dev with fintech experience";

  try {
    // Scoped to the authenticated user via RLS; unauthenticated requests fall back to demo results.
    const supabase = createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("resumes")
        .select("file_name, extracted_text")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const results = data
          .map((row) => ({
            name: row.file_name.replace(/\.pdf$/i, ""),
            role: row.extracted_text || "Resume profile",
            score: calculateScore(query, `${row.file_name} ${row.extracted_text ?? ""}`)
          }))
          .sort((left, right) => right.score - left.score)
          .slice(0, 10);

        return NextResponse.json({ results });
      }
    }
  } catch {
    // Fall back to static demo results if Supabase is unavailable.
  }

  const demoResults = fallbackResults.map((item, index) => ({
    ...item,
    score: index === 0 ? 96 : item.score
  }));

  return NextResponse.json({ results: demoResults });
}
