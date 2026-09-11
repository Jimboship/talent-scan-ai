import Link from "next/link";
import { ArrowRight, BrainCircuit, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";

const features = [
  {
    title: "Upload resumes fast",
    description: "Drop in up to 500 PDFs and securely store everything in Supabase Storage.",
    icon: UploadCloud
  },
  {
    title: "Semantic candidate search",
    description: "Ask for React devs with fintech experience and get ranked matches instantly.",
    icon: BrainCircuit
  },
  {
    title: "Built for hiring teams",
    description: "Track extracted skills, experience, and upload history in a clean dashboard.",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-7xl px-6 py-6">
        <nav className="card-surface flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/20 text-sm font-bold text-primary-100">
              TS
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">TalentScan</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="#features">Features</Link>
            <Link href="#workflow">Workflow</Link>
            <Link href="/login">Login</Link>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-primary-500/40 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-100 transition hover:bg-primary-500/20"
          >
            Launch app
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-10 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-100">
              <Sparkles className="h-4 w-4" />
              AI-powered hiring intelligence
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-bold tracking-tight text-white md:text-6xl">
              Find the right candidates in seconds.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              TalentScan AI helps teams upload resumes, extract skills and experience, and search candidates with natural language prompts across all uploaded profiles.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 font-medium text-white transition hover:bg-primary-600"
              >
                Upload Resumes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-600"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
              <div className="card-surface px-4 py-3">
                <p className="text-2xl font-semibold text-white">500</p>
                <p className="mt-1 text-xs text-slate-400">PDF limit</p>
              </div>
              <div className="card-surface px-4 py-3">
                <p className="text-2xl font-semibold text-white">Top 10</p>
                <p className="mt-1 text-xs text-slate-400">Matches</p>
              </div>
              <div className="card-surface px-4 py-3">
                <p className="text-2xl font-semibold text-white">AI</p>
                <p className="mt-1 text-xs text-slate-400">Search ranking</p>
              </div>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Search</p>
                  <p className="mt-1 text-sm text-slate-200">Natural language</p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  live
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                Search candidates like: React dev with fintech experience
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Senior React Engineer • 96% match",
                  "Frontend Product Engineer • 92% match",
                  "Full Stack Developer • 89% match"
                ].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                    <span className="text-slate-200">{item}</span>
                    <span className="text-xs text-slate-400">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Why teams choose TalentScan</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div key={title} className="card-surface p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="card-surface p-10">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold text-white">From resume pile to ranked shortlist</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              "1. Upload PDFs",
              "2. Extract text + skills",
              "3. Search with semantic prompts"
            ].map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5 text-center">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/10 text-sm font-semibold text-primary-100">
                  {index + 1}
                </div>
                <p className="text-lg font-medium text-slate-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
