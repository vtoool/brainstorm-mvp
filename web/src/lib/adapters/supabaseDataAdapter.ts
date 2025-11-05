"use client";

import { generateBracket, recordWinner } from "@/lib/bracket/generate";
import type {
  ChatMessage,
  CreateIdeaFolderInput,
  CreateIdeaInput,
  CreateTournamentInput,
  Friend,
  Idea,
  IdeaFolder,
  Match,
  MatchWinnerSide,
  Participant,
  Profile,
  Tournament,
  TournamentWithDetails,
  UpdateTournamentMetaInput,
  Visibility,
  TournamentStatus,
  UpdateIdeaFolderInput,
} from "@/lib/domain/types";
import type { DataPort } from "@/lib/ports/DataPort";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { shuffleArray } from "@/lib/utils/shuffle";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface IdeaRow {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
}

interface IdeaFolderRow {
  id: string;
  owner: string;
  title: string;
  description: string | null;
  theme: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  ideas?: IdeaRow[] | null;
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

interface ProfileRow {
  id: string;
  email: string | null;
  nickname: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FriendRow {
  friend_id: string;
  created_at: string;
  friend?: ProfileRow | null;
}

interface ChatRow {
  id: string;
  tournament_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { nickname: string | null } | null;
}

type MatchIdMap = Map<string, Map<string, string>>;

const matchIdsByTournament: MatchIdMap = new Map();
const profileCache = new Map<string, Profile>();

function mapIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapFolder(row: IdeaFolderRow): IdeaFolder {
  const ideas = (row.ideas ?? [])
    .map((idea) => mapIdea({ ...idea, folder_id: idea.folder_id ?? row.id }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    theme: row.theme,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    ideas,
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
    ownerId: row.owner,
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

function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapFriendRow(row: FriendRow): Friend {
  return {
    profileId: row.friend_id,
    nickname: row.friend?.nickname ?? null,
    email: row.friend?.email ?? null,
    addedAt: row.created_at,
  };
}

function mapChatRow(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    authorId: row.author_id,
    authorNickname: row.author?.nickname ?? null,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function fetchProfileById(supabase: SupabaseClient, id: string): Promise<Profile> {
  if (profileCache.has(id)) {
    return profileCache.get(id)!;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,nickname,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Profile not found.");
  }
  const mapped = mapProfileRow(data as ProfileRow);
  profileCache.set(id, mapped);
  return mapped;
}

function cacheProfile(profile: Profile) {
  profileCache.set(profile.id, profile);
}

function invalidateProfile(id: string) {
  profileCache.delete(id);
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
    async listIdeaFolders() {
      const { data, error } = await supabase
        .from("idea_folders")
        .select(
          "id,owner,title,description,theme,color,icon,created_at,ideas(id,folder_id,title,description,created_at)",
        )
        .order("created_at", { ascending: false })
        .order("created_at", { ascending: false, foreignTable: "ideas" });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map((row) => mapFolder(row as unknown as IdeaFolderRow));
    },

    async createIdeaFolder(input: CreateIdeaFolderInput) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Folder title is required");
      }
      const { data: auth } = await supabase.auth.getUser();
      await ensureProfile(supabase, auth.user);
      const description = input.description?.trim() ?? null;
      const theme = input.theme?.trim() ?? null;
      const color = input.color?.trim() ?? null;
      const icon = input.icon?.trim() ?? null;
      const { data, error } = await supabase
        .from("idea_folders")
        .insert({ title, description, theme, color, icon })
        .select(
          "id,owner,title,description,theme,color,icon,created_at,ideas(id,folder_id,title,description,created_at)",
        )
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return mapFolder(data as IdeaFolderRow);
    },

    async updateIdeaFolder(id: string, patch: UpdateIdeaFolderInput) {
      const payload: Record<string, unknown> = {};
      if (patch.title !== undefined) {
        const trimmed = patch.title.trim();
        if (trimmed) {
          payload.title = trimmed;
        }
      }
      if (patch.description !== undefined) {
        payload.description = patch.description?.trim() ? patch.description.trim() : null;
      }
      if (patch.theme !== undefined) {
        payload.theme = patch.theme?.trim() ? patch.theme.trim() : null;
      }
      if (patch.color !== undefined) {
        payload.color = patch.color?.trim() ? patch.color.trim() : null;
      }
      if (patch.icon !== undefined) {
        payload.icon = patch.icon?.trim() ? patch.icon.trim() : null;
      }
      if (Object.keys(payload).length === 0) {
        const { data, error } = await supabase
          .from("idea_folders")
          .select(
            "id,owner,title,description,theme,color,icon,created_at,ideas(id,folder_id,title,description,created_at)",
          )
          .eq("id", id)
          .maybeSingle();
        if (error) {
          throw new Error(error.message);
        }
        return data ? mapFolder(data as IdeaFolderRow) : null;
      }
      const { error } = await supabase.from("idea_folders").update(payload).eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
      const { data, error: fetchError } = await supabase
        .from("idea_folders")
        .select(
          "id,owner,title,description,theme,color,icon,created_at,ideas(id,folder_id,title,description,created_at)",
        )
        .eq("id", id)
        .maybeSingle();
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      return data ? mapFolder(data as IdeaFolderRow) : null;
    },

    async deleteIdeaFolder(id: string) {
      const { error } = await supabase.from("idea_folders").delete().eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },

    async listIdeas() {
      const { data, error } = await supabase
        .from("ideas")
        .select("id,folder_id,title,description,created_at")
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
      const { data: folderRow, error: folderError } = await supabase
        .from("idea_folders")
        .select("id")
        .eq("id", input.folderId)
        .maybeSingle();
      if (folderError) {
        throw new Error(folderError.message);
      }
      if (!folderRow) {
        throw new Error("Folder not found");
      }
      const { data, error } = await supabase
        .from("ideas")
        .insert({ title, description, folder_id: input.folderId })
        .select("id,folder_id,title,description,created_at")
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
        .select("id,owner,name,visibility,status,created_at,room_code,size_suggestion,tournament_participants(id)")
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
      const shuffledIdeas = shuffleArray(orderedIdeas);
      const sizeSuggestion = computeSizeSuggestion(shuffledIdeas.length, input.sizeSuggestion ?? null);
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
      const participantPayload = shuffledIdeas.map((idea, index) => ({
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
      const bracket = generateBracket(participants, { shuffle: false });
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

    async deleteTournament(id: string) {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
      matchIdsByTournament.delete(id);
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
          tournament_id: tournamentId,
          round: match.round,
          position: match.position,
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
      const bracket = generateBracket(participants, { shuffle: false });
      await ensureMatchMappingLoaded(supabase, tournamentId);
      return await this.saveBracket(tournamentId, bracket);
    },

    async getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to view your profile.");
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,nickname,created_at,updated_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Profile not found.");
      }
      const profile = mapProfileRow(data as ProfileRow);
      cacheProfile(profile);
      return profile;
    },

    async updateProfileNickname(nickname: string) {
      const trimmed = nickname.trim();
      if (trimmed.length < 2) {
        throw new Error("Nickname must be at least two characters long.");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to update your nickname.");
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({ nickname: trimmed })
        .eq("id", user.id)
        .select("id,email,nickname,created_at,updated_at")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error("That nickname is already taken.");
        }
        throw new Error(error.message);
      }
      const profile = mapProfileRow(data as ProfileRow);
      cacheProfile(profile);
      return profile;
    },

    async listFriends() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to view friends.");
      }
      const { data, error } = await supabase
        .from("friendships")
        .select("friend_id,created_at,friend:profiles!friendships_friend_id_fkey(id,email,nickname,created_at,updated_at)")
        .eq("owner", user.id)
        .order("created_at", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
return (data ?? []).map((row) => {
  // Normalize embed to a single profile
  type FriendRowWithEmbed = FriendRow & {
    friend: ProfileRow | ProfileRow[] | null | undefined;
  };
  const cast = row as unknown as FriendRowWithEmbed;
  const friend: ProfileRow | null = Array.isArray(cast.friend)
    ? cast.friend?.[0] ?? null
    : cast.friend ?? null;

  if (friend) {
    cacheProfile(mapProfileRow(friend));
  }

  // Map to domain Friend
  return mapFriendRow({
    friend_id: cast.friend_id,
    created_at: cast.created_at,
    friend,
  } as FriendRow);
});
}, // <— this closes listFriends() and separates it from the next method


 addFriend: async (profileId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to add friends.");
      }
      if (!profileId) {
        throw new Error("Select someone to add as a friend.");
      }
      if (profileId === user.id) {
        throw new Error("You can’t add yourself as a friend.");
      }
      const targetProfile = await fetchProfileById(supabase, profileId);
      const { error } = await supabase
        .from("friendships")
        .upsert({ owner: user.id, friend_id: profileId }, { onConflict: "owner,friend_id" });
      if (error && error.code !== "23505") {
        throw new Error(error.message);
      }
      const { data, error: fetchError } = await supabase
        .from("friendships")
        .select("friend_id,created_at,friend:profiles!friendships_friend_id_fkey(id,email,nickname,created_at,updated_at)")
        .eq("owner", user.id)
        .eq("friend_id", profileId)
        .maybeSingle();
      if (fetchError) {
        throw new Error(fetchError.message);
      }
type FriendRowWithEmbed = FriendRow & {
  friend: ProfileRow | ProfileRow[] | null | undefined;
};

const fetched = (data as unknown as FriendRowWithEmbed) ?? null;

// Normalize the embedded profile to a single object
const normalized: FriendRow = fetched
  ? {
      friend_id: fetched.friend_id,
      created_at: fetched.created_at,
      friend: Array.isArray(fetched.friend)
        ? fetched.friend?.[0] ?? null
        : fetched.friend ?? null,
    }
  : {
      friend_id: profileId,
      created_at: new Date().toISOString(),
      friend: {
        id: targetProfile.id,
        email: targetProfile.email,
        nickname: targetProfile.nickname,
        created_at: targetProfile.createdAt,
        updated_at: targetProfile.updatedAt,
      },
    };

// Cache whichever profile we have
if (normalized.friend) {
  cacheProfile(mapProfileRow(normalized.friend));
}

return mapFriendRow(normalized);

    },

    async removeFriend(profileId: string) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureProfile(supabase, user);
      if (!user) {
        throw new Error("You need to sign in to manage friends.");
      }
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("owner", user.id)
        .eq("friend_id", profileId);
      if (error) {
        throw new Error(error.message);
      }
    },

    async searchProfiles(query: string) {
      const trimmed = query.trim();
      if (!trimmed) {
        return [];
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,nickname,created_at,updated_at")
        .ilike("nickname", `%${trimmed}%`)
        .order("nickname", { ascending: true })
        .limit(10);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? [])
        .filter((row) => (row as ProfileRow).nickname)
        .map((row) => {
          const profile = mapProfileRow(row as ProfileRow);
          cacheProfile(profile);
          return profile;
        });
    },

    async listChatMessages(tournamentId: string) {
      const { data, error } = await supabase
        .from("tournament_messages")
        .select("id,tournament_id,author_id,content,created_at,author:profiles!tournament_messages_author_id_fkey(nickname)")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        throw new Error(error.message);
      }
return (data ?? []).map((row) => {
  type ChatRowWithEmbed = ChatRow & {
    author: { nickname: string | null } | { nickname: string | null }[] | null | undefined;
  };
  const cast = row as unknown as ChatRowWithEmbed;
  const author = Array.isArray(cast.author) ? cast.author?.[0] ?? null : cast.author ?? null;
  return mapChatRow({ ...cast, author } as ChatRow);
});
    },

async sendChatMessage(tournamentId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await ensureProfile(supabase, user);
  if (!user) {
    throw new Error("You need to sign in to chat.");
  }
  const profile = await fetchProfileById(supabase, user.id);
  if (!profile.nickname || profile.nickname.trim().length < 2) {
    throw new Error("Set a nickname in settings before chatting.");
  }

  const { data, error } = await supabase
    .from("tournament_messages")
    .insert({ tournament_id: tournamentId, author_id: user.id, content: trimmed })
    .select(
      "id,tournament_id,author_id,content,created_at,author:profiles!tournament_messages_author_id_fkey(nickname)"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Supabase may return the 'author' embed as an array; normalize to a single object
  type ChatRowWithEmbed = {
    id: string;
    tournament_id: string;
    author_id: string;
    content: string;
    created_at: string;
    author?: { nickname: string | null } | { nickname: string | null }[] | null;
  };
  const cast = data as unknown as ChatRowWithEmbed;
  const author =
    Array.isArray(cast.author) ? cast.author?.[0] ?? null : cast.author ?? null;

  const mapped = mapChatRow({
    id: cast.id,
    tournament_id: cast.tournament_id,
    author_id: cast.author_id,
    content: cast.content,
    created_at: cast.created_at,
    author,
  } as ChatRow);

  cacheProfile(profile);
  return mapped;
},

    subscribeToChatMessages(tournamentId: string, handler: (message: ChatMessage) => void) {
      const channel = supabase
        .channel(`tournament-chat:${tournamentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "tournament_messages",
            filter: `tournament_id=eq.${tournamentId}`,
          },
          (payload) => {
            const inserted = payload.new as {
              id: string;
              tournament_id: string;
              author_id: string;
              content: string;
              created_at: string;
            };
            void (async () => {
              try {
                const profile = await fetchProfileById(supabase, inserted.author_id);
                handler({
                  id: inserted.id,
                  tournamentId: inserted.tournament_id,
                  authorId: inserted.author_id,
                  authorNickname: profile.nickname,
                  content: inserted.content,
                  createdAt: inserted.created_at,
                });
              } catch {
                handler({
                  id: inserted.id,
                  tournamentId: inserted.tournament_id,
                  authorId: inserted.author_id,
                  authorNickname: null,
                  content: inserted.content,
                  createdAt: inserted.created_at,
                });
              }
            })();
          },
        )
        .subscribe();
      return () => {
        void channel.unsubscribe();
      };
    },
  } satisfies DataPort;
}
