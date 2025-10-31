"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function SignInPage() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` }
    });
    setSent(true);
  }

  if (sent) return <p>Check your email for a magic link.</p>;

  return (
    <form onSubmit={sendLink} className="space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-3 py-2 rounded w-80"
      />
      <div>
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">
          Send magic link
        </button>
      </div>
    </form>
  );
}
