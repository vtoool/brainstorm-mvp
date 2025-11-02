"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from("tournaments")
      .insert({ name: trimmedName, visibility })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message ?? "Failed to create tournament.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.push("/ideas");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">New Tournament</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="tournament-name" className="text-sm font-medium text-[var(--muted)]">
            Name
          </label>
          <Input
            id="tournament-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="My brilliant tournament"
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="tournament-visibility" className="text-sm font-medium text-[var(--muted)]">
            Visibility
          </label>
          <select
            id="tournament-visibility"
            name="visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "private" | "public")}
            disabled={isSaving}
            className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text)] transition-colors duration-200 focus-visible:outline-none"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="space-y-2">
          <Button type="submit" disabled={isSaving || !name.trim()}>
            Create
          </Button>
          {isSaving ? (
            <p className="text-sm text-[var(--muted)]">Creating...</p>
          ) : (
            errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>
          )}
        </div>
      </form>
    </div>
  );
}
