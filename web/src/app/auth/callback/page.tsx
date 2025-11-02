"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallback() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    let isActive = true;
    let redirected = false;

    function redirectIfSession(nextSession: Session | null) {
      if (!isActive) return;
      if (nextSession && !redirected) {
        redirected = true;
        router.replace("/ideas");
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      redirectIfSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfSession(session);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-[var(--muted)]">Finishing sign in…</p>
    </main>
  );
}
