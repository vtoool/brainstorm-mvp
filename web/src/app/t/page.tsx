"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

const statusStyles: Record<Tournament["status"], string> = {
  draft: "bg-amber-400/25 text-amber-600",
  active: "bg-emerald-400/25 text-emerald-600",
  complete: "bg-purple-400/25 text-purple-600",
};

export default function TournamentListPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [joinHint, setJoinHint] = useState<string | null>(null);

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

  const isJoinDisabled = useMemo(() => roomCode.trim().length < 4, [roomCode]);

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = roomCode.trim().toUpperCase();
    if (trimmed.length < 4) {
      setJoinHint("Enter the four-letter room key to join.");
      return;
    }
    setJoinHint(null);
    setRoomCode(trimmed);
    router.push(`/room/${trimmed}`);
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-transparent bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_65%)] p-[1px] shadow-[0_35px_110px_rgba(59,130,246,0.2)]">
        <div className="relative grid gap-10 rounded-[calc(1.5rem-4px)] bg-[color-mix(in_srgb,var(--panel)_92%,white_8%)] px-6 py-8 sm:px-10 sm:py-12 md:grid-cols-[1.15fr_0.85fr]">
          <span className="pointer-events-none absolute -left-10 bottom-6 h-32 w-32 rounded-full bg-emerald-300/25 blur-3xl" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-14 right-10 h-32 w-32 rounded-full bg-purple-300/25 blur-3xl" aria-hidden="true" />
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-400/25 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-indigo-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Tournament lounge
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-[color-mix(in_srgb,var(--text)_92%,black_8%)]">Host brackets, invite friends, and watch winners shine.</h1>
              <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
                Keep tabs on every bracket you spin up. Jump into private rooms with a key or craft a brand-new showdown in seconds.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/t/new"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-500 px-5 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(20,184,166,0.35)] transition hover:scale-[1.02]"
              >
                Start a tournament
              </Link>
              <p className="text-xs text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">or join friends with a private key →</p>
            </div>
          </div>
          <form
            onSubmit={handleJoin}
            className="space-y-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--panel)_82%,white_12%)] p-6 shadow-[0_28px_70px_rgba(59,130,246,0.18)] backdrop-blur-sm"
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Enter private tournament
              </label>
              <Input
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(event.target.value.toUpperCase());
                  if (joinHint) setJoinHint(null);
                }}
                placeholder="Enter tournament key"
                maxLength={12}
                className="border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] uppercase shadow-[0_20px_45px_rgba(59,130,246,0.18)] focus:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
                Keys are four letters. We’ll whisk you straight into the live voting room.
              </p>
              <Button type="submit" disabled={isJoinDisabled} className="shadow-[0_20px_45px_rgba(59,130,246,0.25)]">
                Join room
              </Button>
            </div>
            <AnimatePresence>
              {joinHint ? (
                <motion.p
                  key={joinHint}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-xs font-medium text-rose-400"
                >
                  {joinHint}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </form>
        </div>
      </section>

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
            <div className="overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)]">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] text-xs font-medium uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--muted)_70%,white_12%)] sm:grid">
                <div className="px-6 py-4">Name</div>
                <div className="px-6 py-4">Status</div>
                <div className="px-6 py-4">Visibility</div>
                <div className="px-6 py-4">Participants</div>
                <div className="px-6 py-4">Created</div>
              </div>
              <AnimatePresence>
                {tournaments.map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-1 gap-y-4 border-t border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--panel)_90%,white_10%)] px-6 py-6 transition hover:bg-[color-mix(in_srgb,var(--panel)_80%,white_20%)] sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-0"
                  >
                    <div className="space-y-1">
                      <Link href={`/t/${tournament.id}`} className="text-base font-semibold text-[color-mix(in_srgb,var(--text)_92%,black_8%)] hover:text-[var(--accent)]">
                        {tournament.name}
                      </Link>
                      <p className="text-xs text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">Room code {tournament.roomCode}</p>
                    </div>
                    <div className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[tournament.status]}`}>
                        {statusCopy[tournament.status]}
                      </span>
                    </div>
                    <div className="text-sm capitalize text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">{tournament.visibility}</div>
                    <div className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">{tournament.ideaCount}</div>
                    <div className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">{dateFormatter.format(new Date(tournament.createdAt))}</div>
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
