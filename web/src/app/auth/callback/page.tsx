"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallback() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/grove");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace("/grove");
    });
    return () => sub.subscription.unsubscribe();
  }, [router, supabase]);

  return <p>Finishing sign in…</p>;
}
