"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Status = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });

      if (error) {
        throw error;
      }

      setEmail("");
      setStatus("sent");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <section className="card w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Sign in to Green Needle</h1>
          <p className="text-sm text-[var(--muted)]">We’ll email you a magic link to tend your grove.</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300" aria-live="polite">
            Check your email for a magic link.
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--muted)]">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby={status === "error" ? "signin-error" : undefined}
              />
            </div>
            <Button type="submit" disabled={status === "sending" || email.trim().length === 0}>
              {status === "sending" ? "Sending…" : "Send magic link"}
            </Button>
            {status === "error" ? (
              <p id="signin-error" className="text-sm text-rose-400">
                {errorMessage}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
