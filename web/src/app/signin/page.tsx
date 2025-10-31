"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message); else setSent(true);
  }
  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {sent ? <p>Check your email for a magic link.</p> : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="w-full border rounded px-3 py-2" type="email" required
            value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@email.com"/>
          <button className="w-full rounded bg-black text-white py-2" type="submit">Send magic link</button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </main>
  );
}
