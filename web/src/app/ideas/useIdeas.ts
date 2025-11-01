"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type Idea = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export function useIdeas() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const savedTimeoutRef = useRef<number | null>(null);

  const clearSavedIndicator = useCallback(() => {
    if (savedTimeoutRef.current) {
      window.clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
    setJustSaved(false);
  }, []);

  const fetchIdeas = useCallback(async (): Promise<Idea[]> => {
    const { data, error: fetchError } = await supabase
      .from("ideas")
      .select("id,title,description,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    return (data ?? []) as Idea[];
  }, [supabase]);

  const refresh = useCallback(
    async ({ showSavedIndicator = false }: { showSavedIndicator?: boolean } = {}) => {
      setIsRefreshing(true);
      const shouldLog = process.env.NODE_ENV === "development";
      if (shouldLog) {
        console.time("ideas:refresh");
      }

      try {
        const nextIdeas = await fetchIdeas();
        setIdeas(nextIdeas);
        setError(null);

        if (showSavedIndicator) {
          clearSavedIndicator();
          setJustSaved(true);
          savedTimeoutRef.current = window.setTimeout(() => {
            setJustSaved(false);
            savedTimeoutRef.current = null;
          }, 2000);
        }
      } catch (refreshError) {
        const { message } = normalizeError(refreshError);
        console.error("Failed to refresh ideas", refreshError);
        setError(message);
      } finally {
        if (shouldLog) {
          console.timeEnd("ideas:refresh");
        }
        setIsRefreshing(false);
      }
    },
    [clearSavedIndicator, fetchIdeas],
  );

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    void (async () => {
      try {
        const nextIdeas = await fetchIdeas();
        if (!isActive) return;
        setIdeas(nextIdeas);
        setError(null);
      } catch (initialError) {
        if (!isActive) return;
        const { message } = normalizeError(initialError);
        console.error("Failed to load ideas", initialError);
        setError(message);
      } finally {
        if (!isActive) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [fetchIdeas]);

  useEffect(() => {
    return () => {
      clearSavedIndicator();
    };
  }, [clearSavedIndicator]);

  const addIdeaOptimistic = useCallback(
    async (title: string, description: string): Promise<boolean> => {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (!trimmedTitle) {
        return false;
      }

      clearSavedIndicator();
      setAddError(null);
      setIsAdding(true);

      const tempId = `temp-${crypto.randomUUID()}`;
      const tempIdea: Idea = {
        id: tempId,
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : null,
        created_at: new Date().toISOString(),
      };

      setIdeas((current) => [tempIdea, ...current]);

      const shouldLog = process.env.NODE_ENV === "development";
      let insertError: PostgrestError | null = null;

      try {
        if (shouldLog) {
          console.time("ideas:insert");
        }
        const { error: supabaseError } = await supabase
          .from("ideas")
          .insert({ title: trimmedTitle, description: trimmedDescription ? trimmedDescription : null }, { returning: "minimal" });
        insertError = supabaseError;
      } catch (unknownError) {
        const { error: normalizedError } = normalizeError(unknownError);
        insertError = normalizedError ?? insertError;
      } finally {
        if (shouldLog) {
          console.timeEnd("ideas:insert");
        }
      }

      if (insertError) {
        setIdeas((current) => current.filter((idea) => idea.id !== tempId));
        const { message } = normalizeError(insertError);
        console.error("Failed to add idea", insertError);
        setAddError(message || "Couldn't add idea. Please try again.");
        setIsAdding(false);
        return false;
      }

      setIsAdding(false);
      void refresh({ showSavedIndicator: true });
      return true;
    },
    [clearSavedIndicator, refresh, supabase],
  );

  const removeIdea = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      let previousIdeas: Idea[] = [];
      setIdeas((current) => {
        previousIdeas = current;
        return current.filter((idea) => idea.id !== id);
      });

      const { error: deleteError } = await supabase.from("ideas").delete().eq("id", id);

      if (deleteError) {
        setIdeas(previousIdeas);
        const { message } = normalizeError(deleteError);
        console.error("Failed to remove idea", deleteError);
        setError(message);
        return false;
      }

      return true;
    },
    [supabase],
  );

  return {
    ideas,
    isLoading,
    isAdding,
    isRefreshing,
    error,
    addError,
    justSaved,
    addIdeaOptimistic,
    refresh,
    removeIdea,
    clearAddError: () => setAddError(null),
  } as const;
}

function normalizeError(error: unknown): { message: string; error: PostgrestError | null } {
  if (!error) {
    return { message: "Something went wrong. Please try again.", error: null };
  }

  if (typeof error === "string") {
    return { message: error, error: null };
  }

  if (isPostgrestError(error)) {
    const message = error.details || error.message || "Something went wrong. Please try again.";
    return { message, error };
  }

  if (error instanceof Error) {
    return { message: error.message, error: null };
  }

  return { message: "Something went wrong. Please try again.", error: null };
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "details" in error &&
    "hint" in error
  );
}
