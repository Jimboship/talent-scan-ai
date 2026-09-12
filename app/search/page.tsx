"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SearchResult = {
  id: string;
  file_name: string;
  name: string;
  skills: string[];
  experience: string;
  similarity: number;
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchFallback() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">Loading search…</p>
      </div>
    </main>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        });
        const json: { results?: SearchResult[]; error?: string } = await response.json();

        if (!response.ok) {
          setResults([]);
          setError(json.error ?? "Search failed. Try again.");
          return;
        }

        if (Array.isArray(json.results)) {
          setResults(json.results.slice(0, 10));
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
        setError("Unable to reach the search API. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, [query]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TalentScan AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Search results</h1>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
            Query: {query || "Enter a query from the dashboard"}
          </div>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <p className="text-sm text-slate-400">Top 10 matches</p>
          </div>

          <div className="divide-y divide-slate-800">
            {loading ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">Searching your resumes…</p>
            ) : error ? (
              <p className="px-6 py-10 text-center text-sm text-rose-300">{error}</p>
            ) : !query ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                Enter a search query on the dashboard to see semantic matches.
              </p>
            ) : results.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                No matching resumes yet. Upload PDFs on the dashboard first.
              </p>
            ) : (
              results.map((result, index) => (
                <div key={`${result.id}-${index}`} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-sm font-semibold text-primary-100">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-base font-medium text-white">{result.name}</p>
                      <p className="text-sm text-slate-400">
                        {result.experience}
                        {result.skills.length > 0 ? ` · ${result.skills.join(", ")}` : ""} · {result.file_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Similarity</p>
                      <p className="text-lg font-semibold text-emerald-300">{result.similarity}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
