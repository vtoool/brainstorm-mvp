"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setEmail(data.session?.user?.email ?? null)
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!email) return <a href="/signin" className="underline">Sign in</a>;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{email}</span>
      <button onClick={() => supabase.auth.signOut()}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm">Sign out</button>
    </div>
  );
}
