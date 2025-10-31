"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthStatus() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (!email) {
    return (
      <a href="/signin" className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">
        Sign in
      </a>
    );
  }

  const initial = email[0]?.toUpperCase();

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5"
        aria-haspopup="menu"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-white text-xs">
          {initial}
        </span>
        <span className="hidden sm:inline text-sm">{email}</span>
      </button>
      <div className="absolute right-0 mt-2 hidden min-w-40 rounded-xl border border-white/10 bg-[var(--panel)] p-2 shadow-soft group-hover:block group-focus-within:block">
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}
