"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Search, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase";

type Candidate = {
  id: number | string;
  name: string;
  skills: string[];
  experience: string;
  uploadedAt: string;
};

const initialCandidates: Candidate[] = [
  {
    id: 1,
    name: "Aisha Carter",
    skills: ["React", "TypeScript", "Fintech"],
    experience: "6 years",
    uploadedAt: "2026-09-10"
  },
  {
    id: 2,
    name: "Mateo Ruiz",
    skills: ["Node.js", "Postgres", "Payments"],
    experience: "5 years",
    uploadedAt: "2026-09-11"
  },
  {
    id: 3,
    name: "Priya Nair",
    skills: ["React", "Design Systems", "AI"],
    experience: "4 years",
    uploadedAt: "2026-09-09"
  }
];

const searchSuggestions = [
  "React dev with fintech experience",
  "Backend engineer for payments",
  "Senior product designer with AI background"
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [query, setQuery] = useState("Search candidates like: React dev with fintech experience");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data, error: fetchError } = await supabase.from("resumes").select("*").order("created_at", { ascending: false });

        if (fetchError || !data || data.length === 0) {
          return;
        }

        const mapped = data.map((row) => ({
          id: row.id,
          name: row.file_name.replace(/\.pdf$/i, ""),
          skills: row.extracted_text ? row.extracted_text.split(/\s+/).slice(0, 3) : ["Resume"],
          experience: "Uploaded",
          uploadedAt: new Date(row.created_at).toISOString().slice(0, 10)
        }));

        setCandidates((current) => [...mapped, ...current.filter((item) => item.id !== 1 && item.id !== 2 && item.id !== 3)]);
      } catch {
        // Ignore missing Supabase setup or empty table.
      }
    };

    void loadCandidates();
  }, [supabase]);

  const filteredCandidates = useMemo(() => {
    const input = query.toLowerCase();

    if (!input || input.startsWith("search candidates like:")) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      [candidate.name, candidate.skills.join(" "), candidate.experience].join(" ").toLowerCase().includes(input)
    );
  }, [candidates, query]);

  const onFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const incoming = Array.from(files).slice(0, 500);

    if (incoming.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const uploadedCandidates: Candidate[] = [];

      for (const file of incoming) {
        const safeName = file.name.replace(/\s+/g, "-");
        const filePath = `${session.user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("resumes")
          .insert([
            {
              user_id: session.user.id,
              file_name: file.name,
              extracted_text: file.name.replace(/\.pdf$/i, ""),
              embedding: null
            }
          ])
          .select()
          .single();

        if (insertError || !inserted) {
          throw insertError ?? new Error("Unable to save resume metadata.");
        }

        uploadedCandidates.push({
          id: inserted.id,
          name: inserted.file_name.replace(/\.pdf$/i, ""),
          skills: inserted.extracted_text ? inserted.extracted_text.split(/\s+/).slice(0, 3) : ["Resume"],
          experience: "Uploaded",
          uploadedAt: new Date(inserted.created_at).toISOString().slice(0, 10)
        });
      }

      setCandidates((current) => [...uploadedCandidates, ...current].slice(0, 500));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload resumes.");
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = () => {
    const nextQuery = query.startsWith("Search candidates like:") ? query.replace("Search candidates like: ", "") : query;
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
  };

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TalentScan AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard</h1>
          </div>
          <button className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-600">
            Sign out
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Search candidates like: React dev with fintech experience"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Storage</p>
                <p className="mt-1 text-2xl font-semibold text-white">{candidates.length}/500</p>
              </div>
              <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-2 text-primary-100">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-primary-500"
                style={{ width: `${Math.min((candidates.length / 500) * 100, 100)}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div
            className={`card-surface relative overflow-hidden border-dashed p-8 transition ${dragActive ? "border-primary-500 bg-primary-500/5" : "border-slate-700"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void onFilesAdded(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => void onFilesAdded(event.target.files)}
            />

            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-100">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">Drop your PDFs here</h2>
              <p className="mt-2 text-slate-300">
                {uploading ? "Uploading and indexing resumes..." : "Upload up to 500 resumes to Supabase Storage and start searching right away."}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </section>

        <section className="mt-8 overflow-hidden card-surface">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <h3 className="text-lg font-medium text-white">Uploaded candidates</h3>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-500/40 bg-primary-500/10 px-3 py-2 text-sm text-primary-100 transition hover:bg-primary-500/20"
            >
              View results <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Skills</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Upload date</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={String(candidate.id)} className="border-t border-slate-800 text-sm text-slate-200">
                    <td className="px-6 py-4 font-medium text-white">{candidate.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill) => (
                          <span key={`${candidate.id}-${skill}`} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{candidate.experience}</td>
                    <td className="px-6 py-4 text-slate-400">{candidate.uploadedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
