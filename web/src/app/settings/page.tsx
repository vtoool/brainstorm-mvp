"use client";

import { useCallback, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { MOCK_STORAGE_KEY } from "@/lib/adapters/mockDataAdapter";

const VOTE_PREFIX = "green-needle:votes:";

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false);

  const handleClear = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!confirm("Clear local data for ideas, tournaments, and votes?")) return;
    try {
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
      const keysToRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(VOTE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      setCleared(true);
    } catch (error) {
      console.error("Failed to clear local data", error);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Tweak your workspace and reset mock data for testing.</p>
      </div>
      <section className="card space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="text-sm text-[var(--muted)]">Toggle between light and dark modes.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h3 className="text-base font-semibold">Clear local data</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Removes mock ideas, tournaments, and voting history stored in your browser.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={handleClear}>
            Clear data
          </Button>
          {cleared ? <p className="mt-2 text-xs text-[var(--muted)]">Data cleared. Refresh to start fresh.</p> : null}
        </div>
      </section>
    </div>
  );
}
