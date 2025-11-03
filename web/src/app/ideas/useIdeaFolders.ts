"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Idea, IdeaFolder } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

interface CreateFolderInput {
  title: string;
  description?: string;
  theme?: string;
  color?: string;
  icon?: string;
}

export function useIdeaFolders() {
  const [folders, setFolders] = useState<IdeaFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creatingIdeaFor, setCreatingIdeaFor] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [ideaError, setIdeaError] = useState<string | null>(null);
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
        const nextFolders = await dataPort.listIdeaFolders();
        setFolders(nextFolders);
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
        const message =
          unknownError instanceof Error ? unknownError.message : "Failed to refresh folders.";
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
        const nextFolders = await dataPort.listIdeaFolders();
        if (!isActive) return;
        setFolders(nextFolders);
        setError(null);
      } catch (unknownError) {
        if (!isActive) return;
        const message =
          unknownError instanceof Error ? unknownError.message : "Failed to load folders.";
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

  const createFolder = useCallback(
    async (input: CreateFolderInput): Promise<boolean> => {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        setFolderError("Folder title is required.");
        return false;
      }

      clearSavedIndicator();
      setFolderError(null);
      setIsCreatingFolder(true);

      try {
        await dataPort.createIdeaFolder({
          title: trimmedTitle,
          description: input.description?.trim(),
          theme: input.theme?.trim(),
          color: input.color?.trim(),
          icon: input.icon?.trim(),
        });
        await refresh({ showSavedIndicator: true });
        setIsCreatingFolder(false);
        return true;
      } catch (unknownError) {
        const message =
          unknownError instanceof Error ? unknownError.message : "Failed to create folder.";
        setFolderError(message);
        setIsCreatingFolder(false);
        return false;
      }
    },
    [clearSavedIndicator, refresh],
  );

  const addIdeaToFolder = useCallback(
    async (folderId: string, title: string, description: string): Promise<boolean> => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setIdeaError("Idea title is required.");
        return false;
      }

      const trimmedDescription = description.trim();
      clearSavedIndicator();
      setIdeaError(null);
      setCreatingIdeaFor(folderId);

      const now = new Date().toISOString();
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticIdea: Idea = {
        id: tempId,
        folderId,
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : null,
        createdAt: now,
      };

      setFolders((current) =>
        current.map((folder) =>
          folder.id === folderId
            ? { ...folder, ideas: [optimisticIdea, ...folder.ideas] }
            : folder,
        ),
      );

      try {
        await dataPort.createIdea({ folderId, title: trimmedTitle, description: trimmedDescription });
        await refresh({ showSavedIndicator: true });
        setCreatingIdeaFor(null);
        return true;
      } catch (unknownError) {
        const message =
          unknownError instanceof Error ? unknownError.message : "Failed to add idea.";
        setIdeaError(message);
        setFolders((current) =>
          current.map((folder) =>
            folder.id === folderId
              ? { ...folder, ideas: folder.ideas.filter((idea) => idea.id !== tempId) }
              : folder,
          ),
        );
        setCreatingIdeaFor(null);
        return false;
      }
    },
    [clearSavedIndicator, refresh],
  );

  const removeIdea = useCallback(async (ideaId: string) => {
    setIdeaError(null);
    setDeletingIdeaId(ideaId);
    let previous: IdeaFolder[] = [];
    setFolders((current) => {
      previous = current.map((folder) => ({ ...folder, ideas: folder.ideas.map((idea) => ({ ...idea })) }));
      return current.map((folder) => ({
        ...folder,
        ideas: folder.ideas.filter((idea) => idea.id !== ideaId),
      }));
    });

    try {
      await dataPort.deleteIdea(ideaId);
      setDeletingIdeaId(null);
      return true;
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Failed to delete idea.";
      setIdeaError(message);
      setFolders(previous);
      setDeletingIdeaId(null);
      return false;
    }
  }, []);

  const removeFolder = useCallback(async (folderId: string) => {
    setFolderError(null);
    setDeletingFolderId(folderId);
    let previous: IdeaFolder[] = [];
    setFolders((current) => {
      previous = current.map((folder) => ({ ...folder, ideas: folder.ideas.map((idea) => ({ ...idea })) }));
      return current.filter((folder) => folder.id !== folderId);
    });

    try {
      await dataPort.deleteIdeaFolder(folderId);
      setDeletingFolderId(null);
      return true;
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Failed to delete folder.";
      setFolderError(message);
      setFolders(previous);
      setDeletingFolderId(null);
      return false;
    }
  }, []);

  const state = useMemo(
    () => ({
      folders,
      isLoading,
      isCreatingFolder,
      isRefreshing,
      creatingIdeaFor,
      deletingFolderId,
      deletingIdeaId,
      error,
      folderError,
      ideaError,
      justSaved,
    }),
    [
      folders,
      isLoading,
      isCreatingFolder,
      isRefreshing,
      creatingIdeaFor,
      deletingFolderId,
      deletingIdeaId,
      error,
      folderError,
      ideaError,
      justSaved,
    ],
  );

  return {
    ...state,
    createFolder,
    addIdeaToFolder,
    removeIdea,
    removeFolder,
    refresh,
    clearFolderError: () => setFolderError(null),
    clearIdeaError: () => setIdeaError(null),
  } as const;
}
