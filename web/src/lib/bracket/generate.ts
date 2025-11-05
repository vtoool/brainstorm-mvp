import type { Match, MatchWinnerSide, Participant, RoundStatus } from "@/lib/domain/types";
import { shuffleArray } from "@/lib/utils/shuffle";

type GenerateBracketOptions = {
  shuffle?: boolean;
};

type Entry = {
  participantId: string | null;
  sourceMatchId: string | null;
};

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
  const matches: Match[] = [];

  let currentEntries: Entry[] = ordered.map((participant) => ({
    participantId: participant.id,
    sourceMatchId: null,
  }));
  let round = 1;

  while (currentEntries.length > 1) {
    const matchesInRound = Math.ceil(currentEntries.length / 2);
    const nextRoundEntries: Entry[] = [];

    for (let position = 1; position <= matchesInRound; position += 1) {
      const index = (position - 1) * 2;
      const entryA = currentEntries[index] ?? null;
      const entryB = currentEntries[index + 1] ?? null;
      const id = `match-r${round}-p${position}`;

      const match: Match = {
        id,
        tournamentId,
        round,
        position,
        status: "pending",
        sides: {
          a: entryA
            ? { participantId: entryA.participantId, sourceMatchId: entryA.sourceMatchId }
            : { participantId: null, sourceMatchId: null },
          b: entryB
            ? { participantId: entryB.participantId, sourceMatchId: entryB.sourceMatchId }
            : { participantId: null, sourceMatchId: null },
        },
        winnerSide: null,
      };

      matches.push(match);
      nextRoundEntries.push({ participantId: null, sourceMatchId: id });
    }

    currentEntries = nextRoundEntries;
    round += 1;
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
