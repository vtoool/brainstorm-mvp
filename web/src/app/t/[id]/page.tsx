"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Match, MatchWinnerSide, Participant, TournamentWithDetails } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";
import { computeOpenMatches, nextRound } from "@/lib/bracket/generate";
import { useElementSize } from "@/hooks/useElementSize";

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

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        setError(null);
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
        setError(null);
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

  const openMatches = useMemo(() => matches.filter((match) => match.status === "open"), [matches]);

  const handleFocusMatch = useCallback(
    (matchId: string) => {
      if (tournament?.status === "active") {
        const target = matches.find((match) => match.id === matchId);
        if (!target || target.status !== "open") {
          return;
        }
      }
      setFocusedMatchId(matchId);
    },
    [matches, tournament?.status],
  );

  useEffect(() => {
    if (matches.length === 0) {
      setFocusedMatchId(null);
      return;
    }

    setFocusedMatchId((current) => {
      if (current && matches.some((match) => match.id === current)) {
        if (openMatches.length > 0 && !openMatches.some((match) => match.id === current)) {
          return openMatches[0]?.id ?? current;
        }
        return current;
      }
      if (openMatches.length > 0) {
        return openMatches[0]?.id ?? null;
      }
      return matches[0]?.id ?? null;
    });
  }, [matches, openMatches]);

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

  const focusedMatch = useMemo(
    () => matches.find((match) => match.id === focusedMatchId) ?? null,
    [matches, focusedMatchId],
  );
  const focusParticipantA = focusedMatch ? resolveParticipant(focusedMatch, "a") : null;
  const focusParticipantB = focusedMatch ? resolveParticipant(focusedMatch, "b") : null;
  const isFocusOpen = focusedMatch?.status === "open";

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
          <AnimatePresence mode="wait">
            {focusedMatch ? (
              <motion.div
                key={focusedMatch.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-6"
              >
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" aria-hidden />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <span>Now battling</span>
                  <span>
                    Match {focusedMatch.round}-{focusedMatch.position} · {focusedMatch.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <FocusCompetitorCard
                    participant={focusParticipantA}
                    side="a"
                    isFocused={isFocusOpen}
                    onSelect={() => void handleWinner(focusedMatch.id, "a")}
                    disabled={!isFocusOpen || !focusParticipantA || !("id" in (focusParticipantA ?? {})) || isMutating}
                  />
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl font-black text-[var(--text)]">VS</span>
                  </div>
                  <FocusCompetitorCard
                    participant={focusParticipantB}
                    side="b"
                    isFocused={isFocusOpen}
                    onSelect={() => void handleWinner(focusedMatch.id, "b")}
                    disabled={!isFocusOpen || !focusParticipantB || !("id" in (focusParticipantB ?? {})) || isMutating}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </aside>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bracket arena</h2>
          <span className="text-xs text-[var(--muted)]">{matches.length} matches</span>
        </div>
        <div className="space-y-6">
          <BracketCanvas
            rounds={rounds}
            matches={matches}
            resolveParticipant={resolveParticipant}
            focusedMatchId={focusedMatchId}
            onFocus={handleFocusMatch}
            onPickWinner={handleWinner}
            isMutating={isMutating}
            tournamentStatus={tournament.status}
          />
        </div>
      </section>
    </div>
  );
}

type FocusCompetitorCardProps = {
  participant: Participant | Partial<Participant> | null;
  side: "a" | "b";
  isFocused: boolean;
  onSelect: () => void;
  disabled: boolean;
};

function FocusCompetitorCard({ participant, side, isFocused, onSelect, disabled }: FocusCompetitorCardProps) {
  const hasParticipant = participant && "ideaTitle" in participant;
  const hasId = participant && "id" in participant;
  const ideaTitle = hasParticipant ? participant.ideaTitle ?? "TBD" : "TBD";
  const seedLabel = hasId ? `Seed ${(participant as Participant).seed}` : "Awaiting match";
  const accent = side === "a" ? "from-emerald-400 to-emerald-600" : "from-sky-400 to-sky-600";

  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left shadow-[0_16px_40px_rgba(0,0,0,0.25)] transition ${
        disabled
          ? "cursor-not-allowed border-[color-mix(in_srgb,var(--border)_90%,transparent)] opacity-80"
          : "cursor-pointer border-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:border-[var(--accent)]"
      } ${isFocused ? "ring-2 ring-offset-2 ring-offset-[var(--panel)] ring-[var(--accent)]" : ""}`}
    >
      <div
        className={`absolute inset-0 opacity-0 transition group-hover:opacity-100 ${
          isFocused ? "opacity-100" : ""
        } bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_65%)]`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-3xl`}
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--muted)]">
          <span>{side === "a" ? "Home" : "Away"}</span>
          <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-3 py-1 text-[var(--muted)]">
            {seedLabel}
          </span>
        </div>
        <p className="text-lg font-semibold leading-tight text-[var(--text)]">{ideaTitle}</p>
        <p className="text-xs text-[color-mix(in_srgb,var(--muted)_80%,transparent)]">
          {hasId ? "Tap to crown the winner" : "Waiting for the previous battle"}
        </p>
      </div>
    </motion.button>
  );
}

const MATCH_WIDTH = 220;
const MATCH_HEIGHT = 188;
const COLUMN_GAP = 120;
const VERTICAL_GAP = 24;
const MAX_MANUAL_SCALE = 2.5;
const MIN_SCALE_FACTOR = 0.5;

type BracketCanvasProps = {
  rounds: { round: number; matches: Match[] }[];
  matches: Match[];
  resolveParticipant: (match: Match, side: "a" | "b") => Participant | Partial<Participant> | null;
  focusedMatchId: string | null;
  onFocus: (matchId: string) => void;
  onPickWinner: (matchId: string, side: MatchWinnerSide) => void;
  isMutating: boolean;
  tournamentStatus: TournamentWithDetails["status"];
};

type LayoutEntry = {
  match: Match;
  x: number;
  y: number;
  roundIndex: number;
};

function BracketCanvas({
  rounds,
  matches,
  resolveParticipant,
  focusedMatchId,
  onFocus,
  onPickWinner,
  isMutating,
  tournamentStatus,
}: BracketCanvasProps) {
  const baseSpacing = MATCH_HEIGHT + VERTICAL_GAP;
  const layoutEntries = useMemo<LayoutEntry[]>(() => {
    const entries: LayoutEntry[] = [];
    rounds.forEach((round, roundIndex) => {
      const spacingMultiplier = Math.pow(2, roundIndex);
      round.matches.forEach((match) => {
        const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
        const y =
          (match.position - 1) * baseSpacing * spacingMultiplier + ((spacingMultiplier - 1) * baseSpacing) / 2;
        entries.push({ match, x, y, roundIndex });
      });
    });
    return entries;
  }, [rounds, baseSpacing]);

  const layoutById = useMemo(() => new Map(layoutEntries.map((entry) => [entry.match.id, entry])), [layoutEntries]);

  const boardWidth = useMemo(() => {
    if (rounds.length === 0) {
      return MATCH_WIDTH;
    }
    return rounds.length * MATCH_WIDTH + (rounds.length - 1) * COLUMN_GAP;
  }, [rounds.length]);

  const firstRoundCount = rounds[0]?.matches.length ?? 1;
  const boardHeight = Math.max((firstRoundCount - 1) * baseSpacing + MATCH_HEIGHT, MATCH_HEIGHT);

  const { ref: sizeRef, size: viewportSize } = useElementSize<HTMLDivElement>();
  const viewportNodeRef = useRef<HTMLDivElement | null>(null);
  const handleViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      sizeRef(node);
      viewportNodeRef.current = node;
    },
    [sizeRef],
  );
  const baseScale = boardWidth === 0 || viewportSize.width === 0 ? 1 : Math.min(viewportSize.width / boardWidth, 1);
  const focusEntry = focusedMatchId ? layoutById.get(focusedMatchId) ?? null : null;
  const targetScale = focusEntry ? Math.min(baseScale * 1.25, 2.2) : baseScale;

  const defaultOffsetX = viewportSize.width / 2 - (boardWidth / 2) * baseScale;
  const defaultOffsetY = viewportSize.height / 2 - (boardHeight / 2) * baseScale;

  let targetX = Number.isFinite(defaultOffsetX) ? defaultOffsetX : 0;
  let targetY = Number.isFinite(defaultOffsetY) ? defaultOffsetY : 0;

  if (focusEntry && viewportSize.width > 0 && viewportSize.height > 0) {
    const focusCenterX = focusEntry.x + MATCH_WIDTH / 2;
    const focusCenterY = focusEntry.y + MATCH_HEIGHT / 2;
    targetX = viewportSize.width / 2 - focusCenterX * targetScale;
    targetY = viewportSize.height / 2 - focusCenterY * targetScale;
  }

  const connections = useMemo(() => {
    const paths: { id: string; d: string }[] = [];
    matches.forEach((match) => {
      (Object.keys(match.sides) as Array<"a" | "b">).forEach((side) => {
        const sourceMatchId = match.sides[side].sourceMatchId;
        if (!sourceMatchId) return;
        const from = layoutById.get(sourceMatchId);
        const to = layoutById.get(match.id);
        if (!from || !to) return;
        const startX = from.x + MATCH_WIDTH;
        const startY = from.y + MATCH_HEIGHT / 2;
        const midX = startX + COLUMN_GAP / 2;
        const endX = to.x;
        const endY = to.y + MATCH_HEIGHT / 2;
        const d = `M${startX},${startY} L${midX},${startY} L${midX},${endY} L${endX},${endY}`;
        paths.push({ id: `${sourceMatchId}->${match.id}-${side}`, d });
      });
    });
    return paths;
  }, [layoutById, matches]);

  const viewportHeight = Math.min(Math.max(boardHeight + 120, 360), 720);
  const canManuallyNavigate = tournamentStatus !== "active";
  const [manualTransform, setManualTransform] = useState({
    x: Number.isFinite(defaultOffsetX) ? defaultOffsetX : 0,
    y: Number.isFinite(defaultOffsetY) ? defaultOffsetY : 0,
    scale: baseScale,
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 });

  useEffect(() => {
    if (!canManuallyNavigate) {
      setHasInteracted(false);
    }
  }, [canManuallyNavigate]);

  useEffect(() => {
    if (!canManuallyNavigate) {
      return;
    }
    if (hasInteracted) {
      return;
    }
    setManualTransform({
      x: Number.isFinite(defaultOffsetX) ? defaultOffsetX : 0,
      y: Number.isFinite(defaultOffsetY) ? defaultOffsetY : 0,
      scale: baseScale,
    });
  }, [baseScale, canManuallyNavigate, defaultOffsetX, defaultOffsetY, hasInteracted]);

  const clampScale = useCallback(
    (value: number) => {
      const minScale = baseScale * MIN_SCALE_FACTOR;
      return Math.min(Math.max(value, minScale), MAX_MANUAL_SCALE);
    },
    [baseScale],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canManuallyNavigate) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }
      const element = event.currentTarget;
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: manualTransform.x,
        originY: manualTransform.y,
      };
      element.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setHasInteracted(true);
    },
    [canManuallyNavigate, manualTransform.x, manualTransform.y],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canManuallyNavigate) {
        return;
      }
      const dragState = dragStateRef.current;
      if (!isDragging || dragState.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      setManualTransform((current) => ({
        ...current,
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY,
      }));
    },
    [canManuallyNavigate, isDragging],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canManuallyNavigate) {
        return;
      }
      const dragState = dragStateRef.current;
      if (dragState.pointerId !== event.pointerId) {
        return;
      }
      const element = event.currentTarget;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = { pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 };
      setIsDragging(false);
    },
    [canManuallyNavigate],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!canManuallyNavigate) {
        return;
      }
      const viewportElement = viewportNodeRef.current;
      if (!viewportElement) {
        return;
      }
      event.preventDefault();
      const rect = viewportElement.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      setManualTransform((current) => {
        const nextScale = clampScale(current.scale * zoomFactor);
        const relativeX = (offsetX - current.x) / current.scale;
        const relativeY = (offsetY - current.y) / current.scale;
        const nextX = offsetX - relativeX * nextScale;
        const nextY = offsetY - relativeY * nextScale;
        return {
          x: nextX,
          y: nextY,
          scale: nextScale,
        };
      });
      setHasInteracted(true);
    },
    [canManuallyNavigate, clampScale],
  );

  const viewTransform = canManuallyNavigate
    ? manualTransform
    : { x: targetX, y: targetY, scale: targetScale };

  const cursorClass = canManuallyNavigate ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default";

  return (
    <div
      ref={handleViewportRef}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]"
      style={{ height: viewportHeight }}
      onWheel={handleWheel}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(90,110,255,0.08),_transparent_70%)]" aria-hidden />
      <motion.div
        className={`absolute inset-0 touch-none ${cursorClass}`}
        style={{ width: boardWidth, height: boardHeight, transformOrigin: "center center" }}
        animate={viewTransform}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg className="absolute inset-0" width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
          {connections.map((connection) => (
            <path
              key={connection.id}
              d={connection.d}
              stroke="color-mix(in srgb, var(--muted) 40%, transparent)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>
        {layoutEntries.map(({ match, x, y }) => {
          const participantA = resolveParticipant(match, "a");
          const participantB = resolveParticipant(match, "b");
          const isOpen = match.status === "open";
          const isFocused = focusedMatchId === match.id;
          return (
            <motion.div
              key={match.id}
              layout
              className={`absolute flex h-full w-full flex-col justify-between rounded-2xl border bg-[var(--card)] p-4 shadow-lg transition ${
                isFocused ? "border-[var(--accent)] shadow-[0_24px_48px_rgba(0,0,0,0.35)]" : "border-[color-mix(in_srgb,var(--border)_70%,transparent)]"
              } ${isOpen ? "ring-1 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]" : ""}`}
              style={{ width: MATCH_WIDTH, height: MATCH_HEIGHT, left: x, top: y }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onFocus(match.id)}
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span>
                  Round {match.round} · Match {match.position}
                </span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] px-2 py-1 text-[var(--muted)]">
                  {match.status}
                </span>
              </div>
              <div className="space-y-3">
                {(Object.keys(match.sides) as Array<"a" | "b">).map((side) => {
                  const participant = side === "a" ? participantA : participantB;
                  const isWinner = match.winnerSide === side;
                  const awaiting = !participant || !("id" in participant);
                  const canPick = isOpen && !awaiting && !isMutating;
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={!canPick}
                      onClick={() => void onPickWinner(match.id, side)}
                      onFocus={() => onFocus(match.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        isWinner
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                          : "border-[var(--border)] bg-[var(--panel)] hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                      } ${canPick ? "cursor-pointer" : "cursor-default opacity-70"}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">
                          {awaiting ? participant?.ideaTitle ?? "TBD" : (participant as Participant).ideaTitle}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {awaiting ? "Awaiting previous match" : `Seed ${(participant as Participant).seed}`}
                        </p>
                      </div>
                      {canPick ? (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                          Crown
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
