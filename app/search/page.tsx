"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SearchResult = {
  name: string;
  score: number;
  role: string;
};

const fallbackResults: SearchResult[] = [
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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>(fallbackResults);

  useEffect(() => {
    const query = searchParams.get("q") ?? "React dev with fintech experience";

    const loadResults = async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await response.json();

        if (Array.isArray(json.results) && json.results.length > 0) {
          setResults(json.results.slice(0, 10));
        }
      } catch {
        setResults(fallbackResults);
      }
    };

    void loadResults();
  }, [searchParams]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TalentScan AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Search results</h1>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
            Query: {searchParams.get("q") ?? "React dev with fintech experience"}
          </div>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <p className="text-sm text-slate-400">Top 10 matches</p>
          </div>

          <div className="divide-y divide-slate-800">
            {results.map((result, index) => (
              <div key={`${result.name}-${index}`} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-sm font-semibold text-primary-100">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">{result.name}</p>
                    <p className="text-sm text-slate-400">{result.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Similarity</p>
                    <p className="text-lg font-semibold text-emerald-300">{result.score}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
