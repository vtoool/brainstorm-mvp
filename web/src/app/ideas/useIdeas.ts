"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Idea } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

export function useIdeas() {
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

  const refresh = useCallback(
    async ({ showSavedIndicator = false }: { showSavedIndicator?: boolean } = {}) => {
      setIsRefreshing(true);
      try {
        const nextIdeas = await dataPort.listIdeas();
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
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : "Failed to refresh ideas.";
        setError(message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [clearSavedIndicator],
  );

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    void (async () => {
      try {
        const nextIdeas = await dataPort.listIdeas();
        if (!isActive) return;
        setIdeas(nextIdeas);
        setError(null);
      } catch (unknownError) {
        if (!isActive) return;
        const message = unknownError instanceof Error ? unknownError.message : "Failed to load ideas.";
        setError(message);
      } finally {
        if (!isActive) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

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
      const now = new Date().toISOString();
      const optimisticIdea: Idea = {
        id: tempId,
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : null,
        createdAt: now,
      };

      setIdeas((current) => [optimisticIdea, ...current]);

      try {
        const created = await dataPort.createIdea({ title: trimmedTitle, description: trimmedDescription });
        setIdeas((current) => current.map((idea) => (idea.id === tempId ? created : idea)));
        setIsAdding(false);
        void refresh({ showSavedIndicator: true });
        return true;
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : "Failed to add idea.";
        setIdeas((current) => current.filter((idea) => idea.id !== tempId));
        setAddError(message);
        setIsAdding(false);
        return false;
      }
    },
    [clearSavedIndicator, refresh],
  );

  const removeIdea = useCallback(async (id: string) => {
    setError(null);
    let previousIdeas: Idea[] = [];
    setIdeas((current) => {
      previousIdeas = current;
      return current.filter((idea) => idea.id !== id);
    });

    try {
      await dataPort.deleteIdea(id);
      return true;
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : "Failed to delete idea.";
      setError(message);
      setIdeas(previousIdeas);
      return false;
    }
  }, []);

  const state = useMemo(
    () => ({
      ideas,
      isLoading,
      isAdding,
      isRefreshing,
      error,
      addError,
      justSaved,
    }),
    [ideas, isLoading, isAdding, isRefreshing, error, addError, justSaved],
  );

  return {
    ...state,
    addIdeaOptimistic,
    refresh,
    removeIdea,
    clearAddError: () => setAddError(null),
  } as const;
}
