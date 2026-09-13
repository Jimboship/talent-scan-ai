"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, FileText, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { resumeToCandidate } from "@/lib/resume-profile";

type DetailsCandidate = ReturnType<typeof resumeToCandidate>;
type PdfPanel = { url: string | null; fileName: string; status: "idle" | "loading" | "ready" | "error"; error: string | null };

export default function CandidateDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [candidate, setCandidate] = useState<DetailsCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdf, setPdf] = useState<PdfPanel>({ url: null, fileName: "", status: "idle", error: null });

  useEffect(() => {
    const loadCandidate = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/candidates/${encodeURIComponent(id)}`);
        const json = (await response.json().catch(() => null)) as { candidate?: DetailsCandidate; error?: string } | null;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok || !json?.candidate) {
          setCandidate(null);
          setError(response.status === 404 ? "Candidate not found." : (json?.error ?? "Unable to load candidate."));
          return;
        }
        setCandidate(json.candidate);
      } catch {
        setCandidate(null);
        setError("Unable to load this candidate. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadCandidate();
  }, [id, router]);

  const handleOpenPdf = async () => {
    setPdf((current) => ({ ...current, status: "loading", error: null }));
    try {
      const response = await fetch(`/api/candidates/${encodeURIComponent(id)}/pdf`);
      const json = (await response.json().catch(() => null)) as { url?: string; fileName?: string; error?: string } | null;
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok || !json?.url) {
        setPdf((current) => ({ ...current, status: "error", error: json?.error ?? "PDF unavailable." }));
        return;
      }
      setPdf({ url: json.url, fileName: json.fileName ?? "", status: "ready", error: null });
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch {
      setPdf((current) => ({ ...current, status: "error", error: "Unable to open the PDF. Check your connection and try again." }));
    }
  };

  const handleDelete = async () => {
    if (!candidate || deleting) {
      return;
    }
    const confirmed = window.confirm(`Delete "${candidate.name}"? This removes the PDF and its record.`);
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(json?.error ?? "Unable to delete this candidate.");
      }
      router.push("/dashboard");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading candidate…</p>
        </div>
      </main>
    );
  }

  if (error || !candidate) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to candidates</button>
          <div className="card-surface p-8 text-center">
            <p className="text-lg font-medium text-white">{error ?? "Candidate not found."}</p>
            <p className="mt-2 text-sm text-slate-400">Return to the candidate list or try again.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to candidates</button>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleOpenPdf()} disabled={pdf.status === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"><FileText className="h-4 w-4" />{pdf.status === "loading" ? "Opening PDF…" : "View PDF"}</button>
            <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"><Trash2 className="h-4 w-4" />{deleting ? "Deleting…" : "Delete"}</button>
          </div>
        </div>
        <section className="card-surface p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Candidate</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{candidate.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {candidate.fileName}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Uploaded {candidate.uploadedAt}</span>
            <span>Experience: {candidate.experience}</span>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(candidate.skills.length > 0 ? candidate.skills : ["Not specified"]).map((skill) => (
              <span key={skill} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">{skill}</span>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
            {pdf.status === "error" ? (<p className="text-rose-300">{pdf.error ?? "PDF unavailable."}</p>) : pdf.status === "ready" && pdf.url ? (<p className="text-slate-300">Secure PDF link ready (expires in 10 minutes). <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="underline">Open again</a></p>) : pdf.status === "loading" ? (<p className="text-slate-300">Opening secure PDF link…</p>) : (<p className="text-slate-400">PDFs stay private. Opening generates a short-lived secure link.</p>)}
          </div>
        </section>
        <section className="card-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Extracted resume text</h2>
          <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">{candidate.extractedText.trim() || "No readable text was extracted."}</pre>
        </section>
      </div>
    </main>
  );
}

