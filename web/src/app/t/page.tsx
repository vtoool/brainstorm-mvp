"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import type { Tournament } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusCopy: Record<Tournament["status"], string> = {
  draft: "Draft",
  active: "Active",
  complete: "Complete",
};

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const next = await dataPort.listTournaments();
        if (isMounted) {
          setTournaments(next);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tournaments</h1>
          <p className="text-sm text-[var(--muted)]">Track drafts, active brackets, and crowned winners.</p>
        </div>
        <Link
          href="/t/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-medium text-[var(--bg)] shadow-[0_15px_30px_rgba(54,211,153,0.25)] transition hover:bg-[color-mix(in_oklab,var(--accent)_85%,black_15%)]"
        >
          New tournament
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)]"
            />
          ))}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {tournaments.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16 text-center"
            >
              <span className="mb-3 text-4xl" aria-hidden="true">
                🌱
              </span>
              <p className="text-sm text-[var(--muted)]">No tournaments yet. Start one to pit your ideas head-to-head.</p>
            </motion.div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-[var(--panel)] text-xs font-medium uppercase tracking-wide text-[var(--muted)] sm:grid">
                <div className="px-6 py-3">Name</div>
                <div className="px-6 py-3">Status</div>
                <div className="px-6 py-3">Visibility</div>
                <div className="px-6 py-3">Participants</div>
                <div className="px-6 py-3">Created</div>
              </div>
              <AnimatePresence>
                {tournaments.map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-1 gap-y-4 border-t border-[var(--border)] bg-[var(--panel)] px-6 py-5 transition hover:bg-[color-mix(in_srgb,var(--panel)_85%,var(--card)_15%)] sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-0"
                  >
                    <div className="space-y-1">
                      <Link href={`/t/${tournament.id}`} className="text-base font-semibold text-[var(--text)] hover:text-[var(--accent)]">
                        {tournament.name}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">Room code {tournament.roomCode}</p>
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                        {statusCopy[tournament.status]}
                      </span>
                    </div>
                    <div className="text-sm capitalize text-[var(--muted)]">{tournament.visibility}</div>
                    <div className="text-sm text-[var(--muted)]">{tournament.ideaCount}</div>
                    <div className="text-sm text-[var(--muted)]">{dateFormatter.format(new Date(tournament.createdAt))}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
