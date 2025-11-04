import type { Match, MatchWinnerSide, Participant, RoundStatus } from "@/lib/domain/types";
import { shuffleArray } from "@/lib/utils/shuffle";

type GenerateBracketOptions = {
  shuffle?: boolean;
};

function powerOfTwoCeil(value: number) {
  return Math.pow(2, Math.max(1, Math.ceil(Math.log2(Math.max(2, value)))));
}

function cloneMatch(match: Match): Match {
  return {
    ...match,
    sides: {
      a: { ...match.sides.a },
      b: { ...match.sides.b },
    },
  };
}

function propagateToNext(matches: Match[], match: Match, winnerSide: MatchWinnerSide) {
  const winnerParticipantId = match.sides[winnerSide].participantId;
  if (!winnerParticipantId) {
    return;
  }
  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.position / 2);
  const nextMatch = matches.find((item) => item.round === nextRound && item.position === nextPosition);
  if (!nextMatch) {
    return;
  }
  const targetSide = match.position % 2 === 1 ? "a" : "b";
  nextMatch.sides[targetSide].participantId = winnerParticipantId;
  nextMatch.sides[targetSide].sourceMatchId = match.id;
}

function autoAdvanceByes(matches: Match[]): Match[] {
  const nextMatches = matches.map(cloneMatch);
  let updated = true;

  while (updated) {
    updated = false;
    for (const match of nextMatches) {
      if (match.status !== "pending") continue;
      const hasA = Boolean(match.sides.a.participantId);
      const hasB = Boolean(match.sides.b.participantId);
      if (hasA && !hasB) {
        match.status = "closed";
        match.winnerSide = "a";
        propagateToNext(nextMatches, match, "a");
        updated = true;
      } else if (!hasA && hasB) {
        match.status = "closed";
        match.winnerSide = "b";
        propagateToNext(nextMatches, match, "b");
        updated = true;
      }
    }
  }

  return nextMatches;
}

export function generateBracket(participants: Participant[], options: GenerateBracketOptions = {}): Match[] {
  if (participants.length === 0) {
    return [];
  }

  const { shuffle = true } = options;
  const tournamentId = participants[0]?.tournamentId ?? "";
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const ordered = shuffle ? shuffleArray(sorted) : sorted;
  const bracketSize = powerOfTwoCeil(ordered.length);
  const slots: Array<Participant | null> = Array.from(
    { length: bracketSize },
    (_, index) => ordered[index] ?? null,
  );
  const totalRounds = Math.log2(bracketSize);

  const matches: Match[] = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let position = 1; position <= matchesInRound; position += 1) {
      const id = `match-r${round}-p${position}`;
      const match: Match = {
        id,
        tournamentId,
        round,
        position,
        status: "pending",
        sides: {
          a: { participantId: null, sourceMatchId: round === 1 ? null : `match-r${round - 1}-p${position * 2 - 1}` },
          b: { participantId: null, sourceMatchId: round === 1 ? null : `match-r${round - 1}-p${position * 2}` },
        },
        winnerSide: null,
      };

      if (round === 1) {
        const baseIndex = (position - 1) * 2;
        const participantA = slots[baseIndex];
        const participantB = slots[baseIndex + 1];
        match.sides.a.participantId = participantA?.id ?? null;
        match.sides.b.participantId = participantB?.id ?? null;
      }

      matches.push(match);
    }
  }

  return autoAdvanceByes(matches);
}

export function recordWinner(matches: Match[], matchId: string, winnerSide: MatchWinnerSide): Match[] {
  const nextMatches = matches.map(cloneMatch);
  const match = nextMatches.find((item) => item.id === matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  match.winnerSide = winnerSide;
  match.status = "closed";
  propagateToNext(nextMatches, match, winnerSide);
  return nextMatches;
}

export function nextRound(matches: Match[]): Match[] {
  const nextMatches = matches.map(cloneMatch);
  const pendingRounds = Array.from(
    new Set(nextMatches.filter((match) => match.status === "pending").map((match) => match.round)),
  ).sort((a, b) => a - b);

  if (pendingRounds.length === 0) {
    return nextMatches;
  }

  const roundToOpen = pendingRounds[0];
  return nextMatches.map((match) =>
    match.round === roundToOpen && match.status === "pending" ? { ...match, status: "open" as RoundStatus } : match,
  );
}

export function computeOpenMatches(matches: Match[]): Match[] {
  return matches.filter((match) => match.status === "open").map(cloneMatch);
}

if (process.env.NODE_ENV === "development") {
  const participants: Participant[] = Array.from({ length: 4 }).map((_, index) => ({
    id: `p-${index + 1}`,
    tournamentId: "t-1",
    ideaId: `idea-${index + 1}`,
    ideaTitle: `Idea ${index + 1}`,
    seed: index + 1,
  }));
  const bracket = generateBracket(participants, { shuffle: false });
  console.assert(bracket.length === 3, "Expected 3 matches for 4 participants");
  const firstMatch = bracket.find((match) => match.id === "match-r1-p1");
  console.assert(firstMatch?.sides.a.participantId === "p-1", "Seed 1 should be in the first slot");
}
