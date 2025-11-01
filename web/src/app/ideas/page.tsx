"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { IdeaCard } from "@/components/IdeaCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthSession } from "@/hooks/useAuthSession";

import { useIdeas } from "./useIdeas";

export default function IdeasPage() {
  const { session, loading } = useAuthSession();
  const {
    ideas,
    isLoading,
    isAdding,
    isRefreshing,
    error,
    addError,
    justSaved,
    addIdeaOptimistic,
    removeIdea,
    clearAddError,
  } = useIdeas();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const ideaCountLabel = useMemo(() => {
    if (ideas.length === 0) return "No ideas yet";
    if (ideas.length === 1) return "1 idea";
    return `${ideas.length} ideas`;
  }, [ideas.length]);

  const statusMessage = useMemo(() => {
    if (isAdding || isRefreshing) {
      return "Saving…";
    }

    if (justSaved) {
      return "Saved";
    }

    return null;
  }, [isAdding, isRefreshing, justSaved]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    const wasAdded = await addIdeaOptimistic(title, description);

    if (wasAdded) {
      setTitle("");
      setDescription("");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Delete this idea?")) return;
    await removeIdea(id);
  }

  if (loading || isLoading) {
    return (
      <main className="space-y-6">
        <section className="card space-y-3">
          <div className="h-4 w-32 rounded-full bg-white/10" />
          <div className="h-10 rounded-xl bg-white/5" />
          <div className="h-24 rounded-xl bg-white/5" />
        </section>
      </main>
    );
  }

  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="space-y-8">
      <section className="card space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Add a new idea</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Capture a spark and iterate fast.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="idea-title" className="text-sm font-medium text-[var(--muted)]">
              Title
            </label>
            <Input
              id="idea-title"
              placeholder="Short title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (addError) {
                  clearAddError();
                }
              }}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-description" className="text-sm font-medium text-[var(--muted)]">
              Description <span className="font-normal text-[var(--muted)]">(optional)</span>
            </label>
            <Textarea
              id="idea-description"
              placeholder="Add a few details or context"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                if (addError) {
                  clearAddError();
                }
              }}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>Ideas are private to you.</span>
              {statusMessage ? (
                <span className={statusMessage === "Saved" ? "text-emerald-400" : undefined}>{statusMessage}</span>
              ) : null}
            </div>
            <Button type="submit" disabled={!title.trim() || isAdding}>
              {isAdding ? "Saving…" : "Add Idea"}
            </Button>
          </div>
        </form>
        <AnimatePresence mode="wait">
          {addError ? (
            <motion.p
              key={addError}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm text-rose-400"
            >
              {addError}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your ideas</h2>
          <span className="text-sm text-[var(--muted)]">{ideaCountLabel}</span>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="relative">
              <IdeaCard title={idea.title} description={idea.description} />
              <div className="absolute right-6 top-6">
                <Button
                  variant="subtle"
                  onClick={() => handleRemove(idea.id)}
                  className="px-2 py-1 text-xs font-medium"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <AnimatePresence>
            {ideas.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 py-14 text-center"
              >
                <span className="mb-3 text-3xl" aria-hidden="true">
                  💡
                </span>
                <p className="text-sm text-[var(--muted)]">No ideas yet—add your first one.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
