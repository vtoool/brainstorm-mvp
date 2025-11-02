"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { IdeaCard } from "@/components/IdeaCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

import { useIdeas } from "./useIdeas";

export default function IdeasPage() {
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

  const statusMessage = useMemo(() => {
    if (isAdding || isRefreshing) return "Saving…";
    if (justSaved) return "Saved";
    return null;
  }, [isAdding, isRefreshing, justSaved]);

  const displayedIdeas = ideas.slice(0, 100);
  const hasOverflow = ideas.length > displayedIdeas.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
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

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="card space-y-4">
          <div className="h-5 w-48 rounded-full bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]" />
          <div className="h-12 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
          <div className="h-24 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <section className="card space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Add a new idea</h1>
          <p className="text-sm text-[var(--muted)]">Capture a spark and iterate fast.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
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
                if (addError) clearAddError();
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
                if (addError) clearAddError();
              }}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>Ideas are private to you.</span>
              <AnimatePresence>
                {statusMessage ? (
                  <motion.span
                    key={statusMessage}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={statusMessage === "Saved" ? "text-[var(--accent)]" : undefined}
                  >
                    {statusMessage}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!title.trim() || isAdding}>
                {isAdding ? "Saving…" : "Add idea"}
              </Button>
            </div>
          </div>
        </form>
        <AnimatePresence mode="wait">
          {addError ? (
            <motion.p
              key={addError}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-sm text-rose-400"
            >
              {addError}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your ideas</h2>
            <p className="text-sm text-[var(--muted)]">{ideas.length === 0 ? "No ideas yet." : `${ideas.length} captured.`}</p>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {displayedIdeas.map((idea) => (
              <motion.div key={idea.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="group relative">
                  <IdeaCard title={idea.title} description={idea.description} />
                  <div className="absolute right-5 top-5">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleRemove(idea.id)}
                      className="rounded-lg px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {ideas.length === 0 && !isLoading ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-14 text-center"
              >
                <span className="mb-3 text-4xl" aria-hidden="true">
                  💡
                </span>
                <p className="text-sm text-[var(--muted)]">No ideas yet—add your first one.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {hasOverflow ? (
          <p className="text-xs text-[var(--muted)]">Showing the latest 100 ideas. Narrow your list to see older entries.</p>
        ) : null}
      </section>
    </div>
  );
}
