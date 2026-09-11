"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("Enter your email to receive a secure login link.");

  const initialError = searchParams.get("error");
  const nextPath = safeNextPath(searchParams.get("next"));

  const statusMessage = useMemo(() => {
    if (initialError && !sent && !loading) {
      return "The login link was invalid or expired. Request a new one.";
    }

    return message;
  }, [initialError, loading, message, sent]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl }
      });

      if (error) {
        throw error;
      }

      setSent(true);
      setMessage("Check your inbox for the magic link. Stay on this page until you open it.");
    } catch (error) {
      setSent(false);
      setMessage(error instanceof Error ? error.message : "Unable to send login link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">TalentScan AI</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Sign in</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-primary-500"
              placeholder="you@company.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full rounded-xl bg-primary-500 px-4 py-3 font-medium text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending link..." : sent ? "Link sent" : "Continue with email"}
          </button>
        </form>

        {statusMessage ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            {statusMessage}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-slate-400">
          Need an account? <Link href="/" className="text-primary-100">Back home</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="card-surface w-full max-w-md p-8 text-center text-slate-300">Loading sign in…</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
