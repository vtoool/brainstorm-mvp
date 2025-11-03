"use client";

import { generateBracket, recordWinner } from "@/lib/bracket/generate";
import type {
  CreateIdeaInput,
  CreateTournamentInput,
  Idea,
  Match,
  MatchWinnerSide,
  Participant,
  Tournament,
  TournamentWithDetails,
  UpdateTournamentMetaInput,
  Visibility,
  TournamentStatus,
} from "@/lib/domain/types";
import type { DataPort } from "@/lib/ports/DataPort";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface TournamentRow {
  id: string;
  owner: string;
  name: string;
  visibility: Visibility;
  status: TournamentStatus;
  created_at: string;
  room_code?: string | null;
  size_suggestion?: number | null;
}

interface ParticipantRow {
  id: string;
  tournament_id: string;
  idea_id: string;
  seed: number;
  idea?: { title: string | null } | null;
  ideas?: { title: string | null } | null;
}

interface MatchRow {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  status: "pending" | "open" | "closed";
  left_participant_id: string | null;
  right_participant_id: string | null;
  winner_participant_id: string | null;
}

type MatchIdMap = Map<string, Map<string, string>>;

const matchIdsByTournament: MatchIdMap = new Map();

function mapIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  };
}

function computeSizeSuggestion(count: number, fallback?: number | null) {
  if (fallback && fallback >= 4) {
    return fallback;
  }
  if (count <= 4) return 4;
  return Math.pow(2, Math.ceil(Math.log2(Math.max(4, count))));
}

function createRoomCode() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `GN-${random}`;
}

function deriveRoomCode(tournamentId: string, explicit?: string | null) {
  if (explicit && explicit.trim().length >= 3) {
    return explicit.trim();
  }
  const compact = tournamentId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `GN-${compact.padEnd(6, "0")}`;
}

function toTournament(row: TournamentRow, participantsCount: number): Tournament {
  const sizeSuggestion = computeSizeSuggestion(participantsCount, row.size_suggestion ?? null);
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    status: row.status,
    createdAt: row.created_at,
    sizeSuggestion,
    ideaCount: participantsCount,
    roomCode: deriveRoomCode(row.id, row.room_code ?? null),
  };
}

function mapParticipant(row: ParticipantRow): Participant {
  const title = row.idea?.title ?? row.ideas?.title ?? "";
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    ideaId: row.idea_id,
    ideaTitle: title,
    seed: row.seed,
  };
}

function matchKey(round: number, position: number) {
  return `match-r${round}-p${position}`;
}

function registerMatchIds(tournamentId: string, rows: MatchRow[]) {
  const mapping = new Map<string, string>();
  rows.forEach((row) => {
    mapping.set(matchKey(row.round, row.position), row.id);
  });
  matchIdsByTournament.set(tournamentId, mapping);
}

function ensureMatchId(tournamentId: string, matchId: string) {
  const mapping = matchIdsByTournament.get(tournamentId);
  return mapping?.get(matchId) ?? null;
}

async function ensureMatchMappingLoaded(supabase: SupabaseClient, tournamentId: string) {
  const existing = matchIdsByTournament.get(tournamentId);
  if (existing && existing.size > 0) {
    return existing;
  }
  const { data, error } = await supabase
    .from("matches")
    .select("id,round,position")
    .eq("tournament_id", tournamentId);
  if (error) {
    throw new Error(error.message);
  }
  registerMatchIds(
    tournamentId,
    (data ?? []).map((row) => row as unknown as MatchRow)
  );
  return matchIdsByTournament.get(tournamentId) ?? new Map<string, string>();
}

function toDomainMatch(row: MatchRow): Match {
  const id = matchKey(row.round, row.position);
  const sourceA = row.round > 1 ? matchKey(row.round - 1, row.position * 2 - 1) : null;
  const sourceB = row.round > 1 ? matchKey(row.round - 1, row.position * 2) : null;
  let winnerSide: MatchWinnerSide | null = null;
  if (row.winner_participant_id && row.left_participant_id === row.winner_participant_id) {
    winnerSide = "a";
  } else if (row.winner_participant_id && row.right_participant_id === row.winner_participant_id) {
    winnerSide = "b";
  }
  return {
    id,
    tournamentId: row.tournament_id,
    round: row.round,
    position: row.position,
    status: row.status,
    sides: {
      a: { participantId: row.left_participant_id, sourceMatchId: sourceA },
      b: { participantId: row.right_participant_id, sourceMatchId: sourceB },
    },
    winnerSide,
  };
}

async function ensureProfile(supabase: SupabaseClient, user: User | null) {
  if (!user) {
    throw new Error("You need to sign in to continue.");
  }
  const payload = { id: user.id, email: user.email ?? null };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error && error.code !== "42501") {
    // Ignore permission errors to allow for read-only environments.
    throw new Error(error.message);
  }
}

async function fetchParticipants(supabase: SupabaseClient, tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select("id,tournament_id,idea_id,seed,idea:ideas(title)")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapParticipant(row as unknown as ParticipantRow));
}

async function fetchMatches(supabase: SupabaseClient, tournamentId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("id,tournament_id,round,position,status,left_participant_id,right_participant_id,winner_participant_id")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("position", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []).map((row) => row as unknown as MatchRow);
  registerMatchIds(tournamentId, rows);
  return rows.map(toDomainMatch);
}

export function getSupabaseDataPort(): DataPort {
  const supabase = getSupabaseBrowser();

  return {
    async listIdeas() {
      const { data, error } = await supabase
        .from("ideas")
        .select("id,title,description,created_at")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map((row) => mapIdea(row as unknown as IdeaRow));
    },

    async createIdea(input: CreateIdeaInput) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Title is required");
      }
      const description = input.description?.trim() ?? null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      const { data, error } = await supabase
        .from("ideas")
        .insert({ title, description })
        .select("id,title,description,created_at")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return mapIdea(data as IdeaRow);
    },

    async deleteIdea(id: string) {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },

    async listTournaments() {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id,name,visibility,status,created_at,room_code,size_suggestion,tournament_participants(id)")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map((row) => {
        const cast = row as unknown as TournamentRow & { tournament_participants?: Array<{ id: string }> };
        const participantCount = cast.tournament_participants?.length ?? 0;
        return toTournament(cast, participantCount);
      });
    },

    async createTournament(input: CreateTournamentInput) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to create a tournament.");
      }
      const uniqueIdeaIds = Array.from(new Set(input.ideaIds));
      if (uniqueIdeaIds.length < 4) {
        throw new Error("Select at least four ideas to create a tournament.");
      }
      const { data: ideaRows, error: ideaError } = await supabase
        .from("ideas")
        .select("id,title")
        .in("id", uniqueIdeaIds);
      if (ideaError) {
        throw new Error(ideaError.message);
      }
      const ideaById = new Map((ideaRows ?? []).map((row) => [row.id as string, row]));
      const orderedIdeas = uniqueIdeaIds
        .map((id) => ideaById.get(id))
        .filter((row): row is { id: string; title: string } => Boolean(row));
      if (orderedIdeas.length < 4) {
        throw new Error("Select at least four ideas to create a tournament.");
      }
      const sizeSuggestion = computeSizeSuggestion(orderedIdeas.length, input.sizeSuggestion ?? null);
      const generatedRoomCode = createRoomCode();
      const basePayload: Record<string, unknown> = {
        owner: user.id,
        name: input.name.trim() || "Untitled Tournament",
        visibility: input.visibility,
        status: "draft",
        room_code: generatedRoomCode,
        size_suggestion: sizeSuggestion,
      };
      let tournamentRow: TournamentRow | null = null;
      let insertError: { message: string; code?: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const payload = attempt === 0 ? basePayload : { ...basePayload };
        if (attempt === 1) {
          delete payload.room_code;
          delete payload.size_suggestion;
        }
        const { data, error } = await supabase
          .from("tournaments")
          .insert(payload)
          .select("id,owner,name,visibility,status,created_at,room_code,size_suggestion")
          .single();
        if (!error && data) {
          tournamentRow = data as TournamentRow;
          break;
        }
        insertError = error ? { message: error.message, code: error.code } : { message: "Unknown error" };
      }
      if (!tournamentRow) {
        throw new Error(insertError?.message ?? "Failed to create tournament.");
      }
      const participantPayload = orderedIdeas.map((idea, index) => ({
        tournament_id: tournamentRow!.id,
        idea_id: idea.id,
        seed: index + 1,
      }));
      const { data: participantRows, error: participantError } = await supabase
        .from("tournament_participants")
        .insert(participantPayload)
        .select("id,tournament_id,idea_id,seed,idea:ideas(title)");
      if (participantError) {
        throw new Error(participantError.message);
      }
      const participants = (participantRows ?? []).map((row) => mapParticipant(row as unknown as ParticipantRow));
      const bracket = generateBracket(participants);
      const matchesPayload = bracket.map((match) => ({
        tournament_id: tournamentRow!.id,
        round: match.round,
        position: match.position,
        status: match.status,
        left_participant_id: match.sides.a.participantId,
        right_participant_id: match.sides.b.participantId,
        winner_participant_id: match.winnerSide ? match.sides[match.winnerSide].participantId : null,
      }));
      if (matchesPayload.length > 0) {
        const { error: matchesError } = await supabase.from("matches").insert(matchesPayload);
        if (matchesError) {
          throw new Error(matchesError.message);
        }
      }
      matchIdsByTournament.delete(tournamentRow.id);
      const details = await this.getTournament(tournamentRow.id);
      if (!details) {
        throw new Error("Tournament not found after creation.");
      }
      return {
        ...details,
        sizeSuggestion,
        roomCode: details.roomCode || generatedRoomCode,
      };
    },

    async getTournament(id: string) {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id,owner,name,visibility,status,created_at,room_code,size_suggestion")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        return null;
      }
      const participants = await fetchParticipants(supabase, id);
      const base = toTournament(data as TournamentRow, participants.length);
      return {
        ...base,
        participants,
      };
    },

    async updateTournamentMeta(id: string, patch: UpdateTournamentMetaInput) {
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        const trimmed = patch.name.trim();
        if (trimmed) {
          payload.name = trimmed;
        }
      }
      if (patch.visibility) {
        payload.visibility = patch.visibility;
      }
      if (patch.status) {
        payload.status = patch.status;
      }
      if (Object.keys(payload).length === 0) {
        return await this.getTournament(id);
      }
      const { error } = await supabase.from("tournaments").update(payload).eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
      return await this.getTournament(id);
    },

    async getParticipants(tournamentId: string) {
      return await fetchParticipants(supabase, tournamentId);
    },

    async getBracket(tournamentId: string) {
      return await fetchMatches(supabase, tournamentId);
    },

    async saveBracket(tournamentId: string, matches: Match[]) {
      const mapping = await ensureMatchMappingLoaded(supabase, tournamentId);
      const updates = matches.map((match) => {
        const dbId = mapping.get(match.id);
        if (!dbId) {
          throw new Error(`Match ${match.id} not found`);
        }
        return {
          id: dbId,
          status: match.status,
          left_participant_id: match.sides.a.participantId,
          right_participant_id: match.sides.b.participantId,
          winner_participant_id: match.winnerSide ? match.sides[match.winnerSide].participantId : null,
        };
      });
      if (updates.length > 0) {
        const { error } = await supabase.from("matches").upsert(updates);
        if (error) {
          throw new Error(error.message);
        }
      }
      return await fetchMatches(supabase, tournamentId);
    },

    async applyMatchResult(tournamentId: string, matchId: string, winnerSide: MatchWinnerSide) {
      const current = await fetchMatches(supabase, tournamentId);
      const nextMatches = recordWinner(current, matchId, winnerSide);
      return await this.saveBracket(tournamentId, nextMatches);
    },

    async reseed(tournamentId: string, participantOrder: string[]) {
      if (participantOrder.length === 0) {
        return await fetchMatches(supabase, tournamentId);
      }
      const updates = participantOrder.map((participantId, index) => ({
        id: participantId,
        seed: index + 1,
      }));
      const { error } = await supabase.from("tournament_participants").upsert(updates);
      if (error) {
        throw new Error(error.message);
      }
      const participants = await fetchParticipants(supabase, tournamentId);
      const bracket = generateBracket(participants);
      await ensureMatchMappingLoaded(supabase, tournamentId);
      return await this.saveBracket(tournamentId, bracket);
    },
  } satisfies DataPort;
}
