"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { IdeaCard } from "@/components/IdeaCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Idea = {
  id: string;
  owner: string | null;
  title: string;
  description: string | null;
  created_at: string;
};

type Feedback = { type: "success" | "error"; message: string };

export default function IdeasPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { session, loading } = useAuthSession();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const userId = session?.user?.id ?? null;

  const fetchIdeas = useCallback(async () => {
    if (!userId) {
      setIdeas([]);
      return;
    }

    const { data, error } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch ideas", {
        code: error.code,
        details: error.details,
        message: error.message,
        hint: error.hint,
      });
      return;
    }

    setIdeas((data ?? []) as Idea[]);
  }, [supabase, userId]);

  useEffect(() => {
    void fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const ideaCountLabel = useMemo(() => {
    if (ideas.length === 0) return "No ideas yet";
    if (ideas.length === 1) return "1 idea";
    return `${ideas.length} ideas`;
  }, [ideas.length]);

  async function addIdea(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("No active session");
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        { id: user.id, email: user.email ?? null },
        { onConflict: "id", ignoreDuplicates: false },
      );

      if (profileError) {
        throw profileError;
      }

      const { data, error } = await supabase
        .from("ideas")
        .insert({ title: trimmedTitle, description: trimmedDescription ? trimmedDescription : null })
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to insert idea");
      }

      setTitle("");
      setDescription("");
      setFeedback({ type: "success", message: "Saved" });
      await fetchIdeas();
    } catch (error) {
      if (typeof error === "object" && error !== null) {
        const { code, details, message, hint } = error as {
          code?: string;
          details?: string;
          message?: string;
          hint?: string;
        };

        console.error("Failed to add idea", { code, details, message, hint, error });
        setFeedback({ type: "error", message: details || message || "Couldn't add idea. Please try again." });
      } else {
        console.error("Failed to add idea", error);
        setFeedback({ type: "error", message: "Couldn't add idea. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeIdea(id: string) {
    if (!confirm("Delete this idea?")) return;

    const previous = ideas;
    setIdeas((current) => current.filter((idea) => idea.id !== id));

    const { error } = await supabase.from("ideas").delete().eq("id", id);

    if (error) {
      setIdeas(previous);
    }
  }

  if (loading) {
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
        <form onSubmit={addIdea} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="idea-title" className="text-sm font-medium text-[var(--muted)]">
              Title
            </label>
            <Input
              id="idea-title"
              placeholder="Short title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">Ideas are private to you.</p>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? "Saving…" : "Add Idea"}
            </Button>
          </div>
        </form>
        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.p
              key={`${feedback.type}-${feedback.message}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={feedback.type === "success" ? "text-sm text-emerald-400" : "text-sm text-rose-400"}
            >
              {feedback.message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your ideas</h2>
          <span className="text-sm text-[var(--muted)]">{ideaCountLabel}</span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="relative">
              <IdeaCard title={idea.title} description={idea.description} />
              <div className="absolute right-6 top-6">
                <Button variant="subtle" onClick={() => removeIdea(idea.id)} className="px-2 py-1 text-xs font-medium">
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
