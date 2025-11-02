"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Match, Participant } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

const STORAGE_PREFIX = "green-needle:votes:";

type RoomPageProps = {
  params: {
    code: string;
  };
};

type VoteStore = Record<string, "a" | "b">;

type RoomMatch = Match & {
  participantA: Participant | null;
  participantB: Participant | null;
};

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const { code } = params;
  const [matches, setMatches] = useState<RoomMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteStore, setVoteStore] = useState<VoteStore>({});
  const [confetti, setConfetti] = useState(false);

  const currentMatch = matches[currentIndex];

  useEffect(() => {
    setVoteStore(readVotes(code));
  }, [code]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        setIsLoading(true);
        const tournaments = await dataPort.listTournaments();
        const target = tournaments.find((tournament) => tournament.roomCode === code);
        if (!target) {
          setError("Room not found.");
          return;
        }
        const [details, bracket, participants] = await Promise.all([
          dataPort.getTournament(target.id),
          dataPort.getBracket(target.id),
          dataPort.getParticipants(target.id),
        ]);
        if (!details) {
          setError("Tournament not available.");
          return;
        }
        const participantMap = Object.fromEntries(participants.map((participant) => [participant.id, participant]));
        const openMatches = bracket
          .filter((match) => match.status === "open")
          .sort((a, b) => (a.round === b.round ? a.position - b.position : a.round - b.round))
          .map((match) => ({
            ...match,
            participantA: match.sides.a.participantId ? participantMap[match.sides.a.participantId] ?? null : null,
            participantB: match.sides.b.participantId ? participantMap[match.sides.b.participantId] ?? null : null,
          }));
        if (!isMounted) return;
        setMatches(openMatches);
        setCurrentIndex(0);
        setError(openMatches.length === 0 ? "No open matches right now." : null);
      } catch (unknownError) {
        if (!isMounted) return;
        const message = unknownError instanceof Error ? unknownError.message : "Failed to load room.";
        setError(message);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [code]);

  const hasAlreadyVoted = useMemo(() => {
    if (!currentMatch) return false;
    return Boolean(voteStore[currentMatch.id]);
  }, [currentMatch, voteStore]);

  const statusLabel = useMemo(() => {
    if (!currentMatch) return "";
    return `Match ${currentIndex + 1} of ${matches.length} (Round ${currentMatch.round})`;
  }, [currentIndex, currentMatch, matches.length]);

  const handleVote = useCallback(
    (side: "a" | "b") => {
      if (!currentMatch || hasAlreadyVoted) return;
      const nextStore: VoteStore = { ...voteStore, [currentMatch.id]: side };
      setVoteStore(nextStore);
      persistVotes(code, nextStore);
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 1500);
      setCurrentIndex((index) => {
        const nextIndex = matches.findIndex((match, idx) => idx > index && !nextStore[match.id]);
        return nextIndex === -1 ? index : nextIndex;
      });
    },
    [code, currentMatch, hasAlreadyVoted, matches, voteStore],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!currentMatch || hasAlreadyVoted) return;
      if (event.key === "ArrowLeft") {
        handleVote("a");
      }
      if (event.key === "ArrowRight") {
        handleVote("b");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [currentMatch, handleVote, hasAlreadyVoted]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-56 rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        <div className="h-64 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)]" />
      </div>
    );
  }

  if (error || !currentMatch) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/t")}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--muted)]">{error ?? "No matches are open for voting."}</p>
        </div>
      </div>
    );
  }

  const { participantA, participantB } = currentMatch;
  const allVoted = matches.length > 0 && matches.every((match) => voteStore[match.id]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Connected (mock)</p>
          <h1 className="mt-2 text-xl font-semibold">{statusLabel}</h1>
        </div>
        <Link href="/t" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          View bracket
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <VoteCard
          label="Left"
          participant={participantA}
          shortcut="←"
          disabled={hasAlreadyVoted}
          onVote={() => handleVote("a")}
        />
        <VoteCard
          label="Right"
          participant={participantB}
          shortcut="→"
          disabled={hasAlreadyVoted}
          onVote={() => handleVote("b")}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">One vote per device. Keyboard shortcuts: use ← or → to pick a side.</p>
      {allVoted ? (
        <p className="text-xs text-[var(--accent)]">You’ve voted on every open matchup. Thanks!</p>
      ) : null}
      <AnimatePresence>
        {confetti ? (
          <motion.div
            key="confetti"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-none fixed inset-0 flex items-center justify-center"
          >
            <motion.span
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] px-4 py-2 text-sm text-[var(--accent)] shadow-lg"
            >
              🎉 Vote sent!
            </motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function VoteCard({
  label,
  participant,
  shortcut,
  disabled,
  onVote,
}: {
  label: string;
  participant: Participant | null;
  shortcut: string;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 text-left shadow-sm">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{label}</span>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_16%,transparent)] px-2 py-1 text-[var(--muted)]">{shortcut}</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--text)]">{participant?.ideaTitle ?? "Awaiting matchup"}</h2>
        {participant ? <p className="text-sm text-[var(--muted)]">Seed {participant.seed}</p> : null}
      </div>
      <Button type="button" disabled={disabled || !participant} onClick={onVote}>
        Vote
      </Button>
    </div>
  );
}

function readVotes(code: string): VoteStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${code}`);
    if (!raw) return {};
    return JSON.parse(raw) as VoteStore;
  } catch {
    return {};
  }
}

function persistVotes(code: string, store: VoteStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${code}`, JSON.stringify(store));
  } catch {
    // ignore
  }
}
