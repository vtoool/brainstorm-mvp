"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallback() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    // supabase-js will read tokens from the URL on the client
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/ideas");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace("/ideas");
    });
    return () => sub.subscription.unsubscribe();
  }, [router, supabase]);

  return <p>Finishing sign in…</p>;
}
