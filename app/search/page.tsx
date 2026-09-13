"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  DATE_OPTIONS,
  EXPERIENCE_OPTIONS,
  SORT_OPTIONS,
  filterCandidates,
  sortCandidates,
  type CandidateSort,
  type DateFilter,
  type ExperienceFilter
} from "@/lib/candidate-filters";

type SearchResult = {
  id: string;
  file_name: string;
  name: string;
  skills: string[];
  experience: string;
  created_at?: string;
  createdAt?: string;
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
  const [skillFilter, setSkillFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("any");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sort, setSort] = useState<CandidateSort>("newest");

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

  const normalizedResults = useMemo(
    () =>
      results.map((result, index) => ({
        ...result,
        createdAt: result.createdAt ?? result.created_at ?? new Date(Date.now() - index * 1000).toISOString()
      })),
    [results]
  );

  const filteredSorted = useMemo(() => {
    const filtered = filterCandidates(normalizedResults, { skill: skillFilter, experience: experienceFilter, date: dateFilter });
    return sortCandidates(filtered, sort);
  }, [normalizedResults, skillFilter, experienceFilter, dateFilter, sort]);

  const availableSkills = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const result of normalizedResults) {
      for (const skill of result.skills) {
        const key = skill.toLowerCase();
        const entry = counts.get(key);
        if (entry) {
          entry.count += 1;
        } else {
          counts.set(key, { label: skill, count: 1 });
        }
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).map((entry) => entry.label);
  }, [normalizedResults]);

  const filtersActive = skillFilter !== "all" || experienceFilter !== "any" || dateFilter !== "all";

  const backHref = "/dashboard";

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TalentScan AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Search results</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={backHref} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500">Back to candidates</Link>
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">Query: {query || "Enter a query from the dashboard"}</div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Skill
            <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-200">
              <option value="all">All skills</option>
              {availableSkills.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Experience
            <select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value as ExperienceFilter)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-200">
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Uploaded
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-200">
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as CandidateSort)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm normal-case tracking-normal text-slate-200">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {filtersActive ? (
          <button type="button" onClick={() => { setSkillFilter("all"); setExperienceFilter("any"); setDateFilter("all"); setSort("newest"); }} className="mb-6 text-sm text-slate-400 underline hover:text-slate-200">Clear filters</button>
        ) : null}
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
              <p className="px-6 py-10 text-center text-sm text-slate-400">Enter a search query on the dashboard to see semantic matches.</p>
            ) : filteredSorted.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">{results.length === 0 ? "No matching resumes yet. Upload PDFs on the dashboard first." : "No candidates match the selected filters."}</p>
            ) : (
              filteredSorted.map((result, index) => (
                <Link key={`${result.id}-${index}`} href={`/dashboard/resumes/${encodeURIComponent(result.id)}`} className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-900/60">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-sm font-semibold text-primary-100">{index + 1}</div>
                    <div>
                      <p className="text-base font-medium text-white">{result.name}</p>
                      <p className="text-sm text-slate-400">{result.experience}{result.skills.length > 0 ? ` · ${result.skills.join(", ")}` : ""} · {result.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Similarity</p>
                      <p className="text-lg font-semibold text-emerald-300">{result.similarity}%</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
