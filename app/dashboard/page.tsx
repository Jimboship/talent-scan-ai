"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Eye, FileText, Loader2, Search, Sparkles, Trash2, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resumeToCandidate } from "@/lib/resume-profile";
import { createClient } from "@/lib/supabase";
import {
  DATE_OPTIONS,
  EXPERIENCE_OPTIONS,
  SORT_OPTIONS,
  filterCandidates,
  getAvailableSkills,
  sortCandidates,
  type CandidateSort,
  type DateFilter,
  type ExperienceFilter
} from "@/lib/candidate-filters";

type Candidate = ReturnType<typeof resumeToCandidate>;

type UploadItemStatus = "queued" | "uploading" | "success" | "error";

type UploadItem = {
  key: string;
  fileName: string;
  size: number;
  status: UploadItemStatus;
  message: string | null;
};

const MAX_RESUMES = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;

const searchSuggestions = [
  "React dev with fintech experience",
  "Backend engineer for payments",
  "Senior product designer with AI background"
];

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("any");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sort, setSort] = useState<CandidateSort>("newest");

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("resumes")
          .select("id, file_name, storage_path, extracted_text, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setCandidates((data ?? []).map(resumeToCandidate));
      } catch {
        setError("Unable to load your resumes. Check your Supabase connection and try again.");
      } finally {
        setLoadingCandidates(false);
      }
    };

    void loadCandidates();
  }, [supabase, router]);

  const textFiltered = useMemo(() => {
    const input = query.trim().toLowerCase();

    if (!input) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      [candidate.name, candidate.skills.join(" "), candidate.experience].join(" ").toLowerCase().includes(input)
    );
  }, [candidates, query]);

  const availableSkills = useMemo(() => getAvailableSkills(candidates), [candidates]);

  const filteredCandidates = useMemo(() => {
    const filtered = filterCandidates(textFiltered, {
      skill: skillFilter,
      experience: experienceFilter,
      date: dateFilter
    });
    return sortCandidates(filtered, sort);
  }, [textFiltered, skillFilter, experienceFilter, dateFilter, sort]);

  const filtersActive = skillFilter !== "all" || experienceFilter !== "any" || dateFilter !== "all";

  const onFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    if (uploading) {
      return;
    }

    const allFiles = Array.from(files);
    const pdfs = allFiles.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    const oversized = allFiles.filter((file) => (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) && file.size > MAX_FILE_BYTES);

    if (pdfs.length === 0) {
      setError("Please upload PDF files only.");
      return;
    }

    const remaining = Math.max(MAX_RESUMES - candidates.length, 0);
    if (remaining === 0) {
      setError("You have reached the 500 resume limit.");
      return;
    }

    const incomingAll = pdfs.slice(0, remaining);
    const incoming = incomingAll.filter((file) => file.size <= MAX_FILE_BYTES);
    const skippedOversized = incomingAll.length - incoming.length;
    const initialItems: UploadItem[] = incoming.map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      fileName: file.name,
      size: file.size,
      status: "queued" as UploadItemStatus,
      message: "Waiting to upload…"
    }));

    if (incoming.length === 0) {
      setUploadItems([]);
      setError(
        oversized.length > 0
          ? `${oversized.map((file) => file.name).join(", ")} ${oversized.length === 1 ? "is" : "are"} larger than 10MB.`
          : "No valid PDF files to upload."
      );
      return;
    }

    setUploadItems(initialItems);
    setUploading(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const uploadedCandidates: Candidate[] = [];
      const warnings: string[] = [
        ...oversized.map((file) => `${file.name} is larger than 10MB.`),
        ...(skippedOversized > 0 ? [`${skippedOversized} file(s) were skipped because they exceed 10MB.`] : [])
      ];

      const validFiles = incoming;

      for (let index = 0; index < validFiles.length; index += MAX_FILES_PER_REQUEST) {
        const batch = validFiles.slice(index, index + MAX_FILES_PER_REQUEST);
        const batchStart = index;

        setUploadItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex >= batchStart && itemIndex < batchStart + batch.length && item.status === "queued"
              ? { ...item, status: "uploading", message: "Uploading to Supabase Storage…" }
              : item
          )
        );

        const formData = new FormData();
        for (const file of batch) {
          formData.append("files", file);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const json = (await response.json()) as {
          candidates?: Candidate[];
          results?: { fileName: string; candidate: Candidate | null; error: string | null }[];
          error?: string;
          errors?: string[];
        };

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          const message = json.error ?? "Unable to upload resumes.";
          setUploadItems((current) =>
            current.map((item, itemIndex) =>
              itemIndex >= batchStart && itemIndex < batchStart + batch.length && item.status === "uploading"
                ? { ...item, status: "error", message }
                : item
            )
          );
          throw new Error(message);
        }

        const resultByName = new Map((json.results ?? []).map((result) => [result.fileName, result]));
        const succeededCount = (json.candidates ?? []).length;
        const errorsInOrder = json.errors ?? [];
        setUploadItems((current) =>
          current.map((item, itemIndex) => {
            if (itemIndex < batchStart || itemIndex >= batchStart + batch.length || item.status !== "uploading") {
              return item;
            }
            const orderIndex = itemIndex - batchStart;
            const fileName = batch[orderIndex]?.name ?? item.fileName;
            const perFile = resultByName.get(fileName);
            if (perFile?.candidate) {
              return { ...item, status: "success", message: "Uploaded and saved." };
            }
            if (perFile?.error) {
              return { ...item, status: "error", message: perFile.error };
            }
            // Fall back to positional matching when the server only returns candidates/errors.
            if (orderIndex < succeededCount && errorsInOrder.length === 0) {
              return { ...item, status: "success", message: "Uploaded and saved." };
            }
            return {
              ...item,
              status: "error",
              message: errorsInOrder[orderIndex] ?? errorsInOrder[0] ?? "Upload failed."
            };
          })
        );

        uploadedCandidates.push(...(json.candidates ?? []));
        if (json.errors?.length) {
          warnings.push(...json.errors);
        }
      }

      setCandidates((current) => [...uploadedCandidates, ...current].slice(0, MAX_RESUMES));

      const skippedNonPdf = allFiles.length - pdfs.length;
      const skippedLimit = pdfs.length - incomingAll.length;
      const extra: string[] = [
        skippedNonPdf > 0 ? `${skippedNonPdf} non-PDF file(s) were ignored.` : null,
        skippedLimit > 0 ? `${skippedLimit} file(s) were skipped because of the 500 resume limit.` : null,
        ...warnings
      ].filter((value): value is string => value !== null);

      if (uploadedCandidates.length > 0) {
        setSuccessMessage(
          `Uploaded ${uploadedCandidates.length} resume${uploadedCandidates.length === 1 ? "" : "s"} to Supabase Storage.`
        );
      }

      if (extra.length > 0) {
        setError(extra.join(" "));
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload resumes.");
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = () => {
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (deletingId !== null || uploading) {
      return;
    }

    const confirmed = window.confirm(`Delete "${name}"? This removes the PDF and its database record.`);
    if (!confirmed) {
      return;
    }

    const candidateId = String(id);
    setDeletingId(candidateId);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(candidateId)}`, { method: "DELETE" });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(json?.error ?? "Unable to delete this resume.");
      }

      setCandidates((current) => current.filter((candidate) => String(candidate.id) !== candidateId));
      setSuccessMessage(`Deleted "${name}". You can upload another resume within your 500 limit.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this resume.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">TalentScan AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
              router.refresh();
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-600"
          >
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
              accept=".pdf,application/pdf"
              multiple
              disabled={uploading}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
              onChange={(event) => {
                void onFilesAdded(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-100">
                {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">Drop your PDFs here</h2>
              <p className="mt-2 text-slate-300">
                {uploading
                  ? "Uploading resumes to Supabase Storage…"
                  : "Upload up to 500 PDF resumes (max 10MB each) to Supabase Storage."}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                Drag and drop or click to browse • PDF only • multiple files supported
              </p>
            </div>
          </div>

          {uploadItems.length > 0 ? (
            <div className="card-surface mt-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <p className="text-sm font-medium text-white">
                  Upload progress ({uploadItems.filter((item) => item.status === "success").length}/{uploadItems.length})
                </p>
                {uploading ? (
                  <p className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUploadItems([])}
                    className="text-xs text-slate-400 transition hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ul className="max-h-64 divide-y divide-slate-800 overflow-y-auto">
                {uploadItems.map((item) => (
                  <li key={item.key} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <span className="mt-0.5 text-slate-400">
                      {item.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : item.status === "error" ? (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      ) : item.status === "uploading" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-100" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-100">{item.fileName}</span>
                      <span
                        className={
                          item.status === "success"
                            ? "text-emerald-300"
                            : item.status === "error"
                              ? "text-rose-300"
                              : "text-slate-400"
                        }
                      >
                        {item.status === "queued"
                          ? `Queued • ${(item.size / 1024 / 1024).toFixed(2)} MB`
                          : (item.message ?? item.status)}
                      </span>
                    </span>
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400">
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          ) : null}

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

          <div className="grid gap-3 border-b border-slate-800 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Skill</span>
              <select
                value={skillFilter}
                onChange={(event) => setSkillFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                <option value="all">All skills</option>
                {availableSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Experience</span>
              <select
                value={experienceFilter}
                onChange={(event) => setExperienceFilter(event.target.value as ExperienceFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Uploaded</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                {DATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as CandidateSort)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filtersActive ? (
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-2 text-xs text-slate-400">
              <span>
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </span>
              <button
                type="button"
                onClick={() => {
                  setSkillFilter("all");
                  setExperienceFilter("any");
                  setDateFilter("all");
                }}
                className="text-primary-200 transition hover:text-white"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Skills</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Upload date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCandidates ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your resumes…
                      </span>
                    </td>
                  </tr>
                ) : filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                      {candidates.length === 0
                        ? "No resumes yet. Drop PDFs above to store them in your private Supabase folder."
                        : "No candidates match these filters. Clear filters or adjust your search."}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isDeleting = deletingId === String(candidate.id);
                    return (
                      <tr key={String(candidate.id)} className="border-t border-slate-800 text-sm text-slate-200">
                        <td className="px-6 py-4 font-medium text-white">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/resumes/${encodeURIComponent(String(candidate.id))}`)}
                            className="transition hover:text-primary-200 hover:underline"
                          >
                            {candidate.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(candidate.skills.length > 0 ? candidate.skills : ["Not specified"]).map((skill) => (
                              <span
                                key={`${candidate.id}-${skill}`}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">{candidate.experience}</td>
                        <td className="px-6 py-4 text-slate-400">{candidate.uploadedAt}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/resumes/${encodeURIComponent(String(candidate.id))}`)}
                              aria-label={`View ${candidate.name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(candidate.id, candidate.name)}
                              disabled={isDeleting || uploading}
                              aria-label={`Delete ${candidate.name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              {isDeleting ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
