"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SessionState = {
  session: Session | null;
  loading: boolean;
};

export function useAuthSession(): SessionState {
  const supabase = getSupabaseBrowser();
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setState({ session: data.session ?? null, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
