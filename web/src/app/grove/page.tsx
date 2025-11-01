"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function GrovePage() {
  const supabase = getSupabaseBrowser();
  const { session, loading } = useAuthSession();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setIdeas([]);
      return;
    }

    const fetchIdeas = async () => {
      const query = supabase.from("ideas").select("*").order("created_at", { ascending: false });
      const { data } = await query.eq("owner", userId);
      setIdeas((data ?? []) as Idea[]);
    };

    void fetchIdeas();
  }, [supabase, userId]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const ideaCountLabel = useMemo(() => {
    if (ideas.length === 0) return "No seeds yet";
    if (ideas.length === 1) return "1 idea";
    return `${ideas.length} ideas`;
  }, [ideas.length]);

  async function addIdea(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!userId) {
      alert("Sign in first");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) return;

    setIsSubmitting(true);
    setFeedback(null);

    const newIdea = { title: trimmedTitle, description: trimmedDescription || null, owner: userId };

    setTitle("");
    setDescription("");

    const tempId = crypto.randomUUID();
    const optimistic: Idea = {
      id: tempId,
      owner: userId,
      title: newIdea.title,
      description: newIdea.description,
      created_at: new Date().toISOString(),
    };

    setIdeas((current) => [optimistic, ...current]);

    try {
      const { data, error } = await supabase.from("ideas").insert(newIdea).select("*").single();
      if (error || !data) {
        throw error ?? new Error("Failed to insert idea");
      }

      setIdeas((current) => [data as Idea, ...current.filter((idea) => idea.id !== tempId)]);
      setFeedback({ type: "success", message: "Seed planted!" });
    } catch (error) {
      console.error(error);
      setIdeas((current) => current.filter((idea) => idea.id !== tempId));
      setTitle(trimmedTitle);
      setDescription(trimmedDescription);
      setFeedback({ type: "error", message: "Couldn't add idea. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeIdea(id: string) {
    if (!confirm("Clear this idea from your grove?")) return;

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
          <h1 className="text-xl font-semibold">Plant a new idea</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Capture a spark and give it room to grow.</p>
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
            <p className="text-xs text-[var(--muted)]">Your grove is private to you.</p>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? "Planting…" : "Plant idea"}
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
          <h2 className="text-lg font-semibold">Your grove</h2>
          <span className="text-sm text-[var(--muted)]">{ideaCountLabel}</span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="relative">
              <IdeaCard title={idea.title} description={idea.description} />
              <div className="absolute right-6 top-6">
                <Button variant="subtle" onClick={() => removeIdea(idea.id)} className="px-2 py-1 text-xs font-medium">
                  Remove
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
                <p className="text-sm text-[var(--muted)]">No seeds here yet—plant your first idea.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
