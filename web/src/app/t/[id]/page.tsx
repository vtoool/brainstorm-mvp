"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Match, MatchWinnerSide, Participant, TournamentWithDetails } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";
import { computeOpenMatches, nextRound } from "@/lib/bracket/generate";

type TournamentPageProps = {
  params: {
    id: string;
  };
};

const statusLabels: Record<TournamentWithDetails["status"], string> = {
  draft: "Draft",
  active: "Active",
  complete: "Complete",
};

const statusColors: Record<TournamentWithDetails["status"], string> = {
  draft: "bg-[color-mix(in_srgb,var(--muted)_16%,transparent)] text-[var(--muted)]",
  active: "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
  complete: "bg-[color-mix(in_srgb,var(--muted)_16%,transparent)] text-[var(--muted)]",
};

export default function TournamentDetailPage({ params }: TournamentPageProps) {
  const router = useRouter();
  const { id } = params;
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        setIsLoading(true);
        const [details, bracket] = await Promise.all([dataPort.getTournament(id), dataPort.getBracket(id)]);
        if (!isMounted) return;
        if (!details) {
          setError("Tournament not found.");
          return;
        }
        setTournament(details);
        setParticipants(Object.fromEntries(details.participants.map((participant) => [participant.id, participant])));
        setMatches(bracket);
      } catch (unknownError) {
        if (!isMounted) return;
        const message = unknownError instanceof Error ? unknownError.message : "Failed to load tournament.";
        setError(message);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const rounds = useMemo(() => {
    const byRound = new Map<number, Match[]>();
    matches.forEach((match) => {
      if (!byRound.has(match.round)) {
        byRound.set(match.round, []);
      }
      byRound.get(match.round)!.push(match);
    });
    return Array.from(byRound.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({ round, matches: list.sort((a, b) => a.position - b.position) }));
  }, [matches]);

  async function updateMatches(nextMatches: Match[]) {
    setMatches(nextMatches);
    await dataPort.saveBracket(id, nextMatches);
  }

  async function handleStart() {
    if (!tournament) return;
    setIsMutating(true);
    try {
      const opened = nextRound(matches);
      await updateMatches(opened);
      const updatedTournament = await dataPort.updateTournamentMeta(id, { status: "active" });
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
    } finally {
      setIsMutating(false);
    }
  }

  async function handleOpenNextRound() {
    setIsMutating(true);
    try {
      const opened = nextRound(matches);
      await updateMatches(opened);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCloseOpenRound() {
    setIsMutating(true);
    try {
      const nextMatches = matches.map((match) => {
        if (match.status === "open" && match.winnerSide) {
          return { ...match, status: "closed" as const };
        }
        return match;
      });
      await updateMatches(nextMatches);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleReset() {
    if (!tournament) return;
    setIsMutating(true);
    try {
      const participantOrder = tournament.participants
        .slice()
        .sort((a, b) => a.seed - b.seed)
        .map((participant) => participant.id);
      const resetMatches = await dataPort.reseed(id, participantOrder);
      setMatches(resetMatches);
      const refreshedParticipants = await dataPort.getParticipants(id);
      setParticipants(Object.fromEntries(refreshedParticipants.map((participant) => [participant.id, participant])));
      const updatedTournament = await dataPort.updateTournamentMeta(id, { status: "draft" });
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
    } finally {
      setIsMutating(false);
    }
  }

  async function handleWinner(matchId: string, side: MatchWinnerSide) {
    setIsMutating(true);
    try {
      const nextMatches = await dataPort.applyMatchResult(id, matchId, side);
      setMatches(nextMatches);
      const open = computeOpenMatches(nextMatches);
      if (open.length === 0) {
        const opened = nextRound(nextMatches);
        await updateMatches(opened);
      }
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCopyRoomCode() {
    if (!tournament) return;
    try {
      await navigator.clipboard.writeText(tournament.roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  }

  function resolveParticipant(match: Match, side: "a" | "b") {
    const sideData = match.sides[side];
    if (sideData.participantId) {
      return participants[sideData.participantId] ?? null;
    }
    if (sideData.sourceMatchId) {
      const [roundLabel, positionLabel] = sideData.sourceMatchId.replace("match-", "").split("-");
      return { ideaTitle: `Winner of ${roundLabel.toUpperCase()} ${positionLabel?.toUpperCase() ?? ""}` } as Partial<Participant>;
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <div className="h-64 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)]" />
          <div className="h-64 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)]" />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/t")}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-8">
          <p className="text-sm text-rose-400">{error ?? "Tournament not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-6">
        <button
          type="button"
          onClick={() => router.push("/t")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
        </button>
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-[var(--text)]">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${statusColors[tournament.status]}`}>
                {statusLabels[tournament.status]}
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] px-3 py-1 capitalize text-[var(--muted)]">
                {tournament.visibility}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">{tournament.ideaCount} ideas seeded into a {tournament.sizeSuggestion}-slot bracket.</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            <div className="flex items-center justify-between">
              <span>Room code</span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-lg font-semibold text-[var(--text)]">{tournament.roomCode}</p>
          </div>
          <div className="space-y-3">
            <Button type="button" onClick={handleStart} disabled={isMutating || tournament.status === "active"}>
              Start tournament
            </Button>
            <Button type="button" variant="secondary" onClick={handleOpenNextRound} disabled={isMutating}>
              Open next round
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseOpenRound} disabled={isMutating}>
              Close round
            </Button>
            <Button type="button" variant="subtle" onClick={handleReset} disabled={isMutating}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Reset bracket
            </Button>
          </div>
        </div>
      </aside>
      <section className="overflow-x-auto">
        <div className="min-w-[720px] space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bracket</h2>
            <span className="text-xs text-[var(--muted)]">{matches.length} matches</span>
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(200px, 1fr))` }}>
            {rounds.map((round) => (
              <div key={round.round} className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--muted)]">Round {round.round}</h3>
                <AnimatePresence mode="popLayout">
                  {round.matches.map((match) => {
                    const participantA = resolveParticipant(match, "a");
                    const participantB = resolveParticipant(match, "b");
                    const isOpen = match.status === "open";
                    return (
                      <motion.div
                        key={match.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                          <span>Match {match.round}-{match.position}</span>
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] px-2 py-1 text-[var(--muted)]">
                            {match.status}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {["a", "b"].map((sideKey) => {
                            const side = sideKey as "a" | "b";
                            const participant = side === "a" ? participantA : participantB;
                            const isWinner = match.winnerSide === side;
                            const awaiting = !participant || !("id" in participant);
                            return (
                              <button
                                key={side}
                                type="button"
                                disabled={!isOpen || !participant || awaiting}
                                onClick={() => handleWinner(match.id, side)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                  isWinner
                                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                                    : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--accent)_22%,transparent)]"
                                } ${isOpen ? "cursor-pointer" : "cursor-default"}`}
                              >
                                <div>
                                  <p className="text-sm font-medium text-[var(--text)]">
                                    {awaiting ? (participant?.ideaTitle ?? "TBD") : (participant as Participant).ideaTitle}
                                  </p>
                                  <p className="text-xs text-[var(--muted)]">
                                    {awaiting
                                      ? "Awaiting previous match"
                                      : `Seed ${(participant as Participant).seed.toString()}`}
                                  </p>
                                </div>
                                {isOpen ? (
                                  <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-xs text-[var(--accent)]">
                                    Pick winner
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                        {isOpen ? (
                          <Link
                            href={`/room/${tournament.roomCode}?match=${match.id}`}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                          >
                            Open vote room
                          </Link>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
