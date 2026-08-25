"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = String(form.get("username") ?? "");

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push("/home");
      router.refresh();
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // Supabase silently no-ops (no error, no session) when the email is already registered —
    // this is intentional anti-enumeration behavior, surfaced here via the empty identities array.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("That email is already registered — sign in instead.");
      setMode("signin");
      return;
    }
    if (!data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("signin");
      return;
    }
    router.push("/home");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="font-display font-extrabold text-2xl tracking-wide text-ink">GATE FORCE</div>
          <div className="font-display font-semibold text-xs tracking-widest text-inkGhost uppercase mt-1">
            DA 2027 · Discipline Rewarded
          </div>
        </div>

        {mode === "signup" && (
          <input
            name="username"
            placeholder="Username"
            required
            className="bg-card border border-hairline rounded-lg px-3 py-2.5 text-ink"
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="bg-card border border-hairline rounded-lg px-3 py-2.5 text-ink"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="bg-card border border-hairline rounded-lg px-3 py-2.5 text-ink"
        />

        {error && <div className="text-sm text-danger">{error}</div>}
        {notice && <div className="text-sm text-success">{notice}</div>}

        <button
          type="submit"
          className="bg-accent text-accentInk font-display font-extrabold rounded-lg py-3 hover:brightness-110 transition"
        >
          {submitting ? "…" : mode === "signin" ? "ENTER THE FORCE" : "ENLIST"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-inkFaint hover:text-inkMuted"
        >
          {mode === "signin" ? "New recruit? Create an account" : "Already enlisted? Sign in"}
        </button>
      </form>
    </main>
  );
}
