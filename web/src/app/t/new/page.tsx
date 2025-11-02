"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Idea, Visibility } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

const steps = ["Basics", "Select ideas"];

function nextPowerOfTwo(value: number) {
  if (value <= 2) return 2;
  return Math.pow(2, Math.ceil(Math.log2(value)));
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("Green Needle Throwdown");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [sizeSuggestion, setSizeSuggestion] = useState(8);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const nextIdeas = await dataPort.listIdeas();
      if (isMounted) {
        setIdeas(nextIdeas);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ideas;
    return ideas.filter((idea) => idea.title.toLowerCase().includes(query));
  }, [ideas, search]);

  const recommendedSize = useMemo(() => nextPowerOfTwo(Math.max(selectedIds.length, 2)), [selectedIds.length]);

  const canProceedFromBasics = name.trim().length > 2;
  const canProceedFromSelection = selectedIds.length >= 2;

  function goToStep(step: number) {
    setCurrentStep(Math.min(Math.max(step, 0), steps.length - 1));
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep === 0) {
      goToStep(1);
      return;
    }

    if (selectedIds.length < 2) {
      setError("Select at least two ideas to create a tournament.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const tournament = await dataPort.createTournament({
        name,
        visibility,
        ideaIds: selectedIds,
        sizeSuggestion,
      });
      router.push(`/t/${tournament.id}`);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : "Failed to create tournament.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/t")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
        </button>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">New tournament</h1>
          <p className="text-sm text-[var(--muted)]">Guide your ideas from spark to showdown.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                index === currentStep
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {index + 1}
            </span>
            <span className={index === currentStep ? "text-[var(--text)]" : undefined}>{step}</span>
            {index < steps.length - 1 ? <span className="text-[color-mix(in_srgb,var(--muted)_60%,transparent)]">/</span> : null}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 0 ? (
          <motion.section
            key="step-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card space-y-5"
          >
            <div className="space-y-3">
              <label htmlFor="tournament-name" className="text-sm font-medium text-[var(--muted)]">
                Tournament name
              </label>
              <Input
                id="tournament-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-3">
              <span className="text-sm font-medium text-[var(--muted)]">Visibility</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(["private", "public"] as Visibility[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      visibility === option
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                        : "border-[var(--border)] bg-[var(--panel)] hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                    }`}
                  >
                    <span className="text-sm font-semibold text-[var(--text)] capitalize">{option}</span>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {option === "private"
                        ? "Only you can see and manage this tournament."
                        : "Anyone with the room code can follow along."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label htmlFor="size-suggestion" className="text-sm font-medium text-[var(--muted)]">
                Target bracket size
              </label>
              <Input
                id="size-suggestion"
                type="number"
                min={2}
                step={2}
                value={sizeSuggestion}
                onChange={(event) => setSizeSuggestion(Math.max(2, Number(event.target.value) || 2))}
              />
              <p className="text-xs text-[var(--muted)]">
                Pick a power of two (4, 8, 16…). We will recommend {recommendedSize} based on your selections.
              </p>
            </div>
          </motion.section>
        ) : null}

        {currentStep === 1 ? (
          <motion.section
            key="step-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card space-y-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Select ideas</h2>
              <p className="text-sm text-[var(--muted)]">
                {selectedIds.length} selected / recommended {recommendedSize}
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
              <Input
                placeholder="Search ideas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pr-1">
              {filteredIdeas.map((idea) => {
                const isSelected = selectedIds.includes(idea.id);
                return (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => toggleSelection(idea.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                        : "border-[var(--border)] bg-[var(--panel)] hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{idea.title}</p>
                        {idea.description ? (
                          <p className="mt-1 overflow-hidden text-ellipsis text-xs text-[var(--muted)]" title={idea.description}>
                            {idea.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isSelected
                            ? "bg-[var(--accent)] text-[var(--bg)]"
                            : "border border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        {isSelected ? selectedIds.indexOf(idea.id) + 1 : "+"}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredIdeas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                  No ideas match “{search}”.
                </p>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          {currentStep === 0 && !canProceedFromBasics ? "Give your tournament a name." : null}
          {currentStep === 1 && !canProceedFromSelection ? "Select at least two ideas." : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {currentStep > 0 ? (
            <Button type="button" variant="subtle" onClick={() => goToStep(currentStep - 1)}>
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={
              isSaving ||
              (currentStep === 0 && !canProceedFromBasics) ||
              (currentStep === 1 && !canProceedFromSelection)
            }
          >
            {currentStep === 1 ? (isSaving ? "Creating…" : "Create tournament") : "Next"}
          </Button>
        </div>
      </div>
    </form>
  );
}
