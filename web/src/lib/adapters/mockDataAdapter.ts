"use client";

import {
  type CreateIdeaFolderInput,
  type CreateIdeaInput,
  type CreateTournamentInput,
  type Idea,
  type IdeaFolder,
  type Match,
  type MatchWinnerSide,
  type Participant,
  type Tournament,
  type TournamentWithDetails,
  type UpdateTournamentMetaInput,
  type UpdateIdeaFolderInput,
} from "@/lib/domain/types";
import type { DataPort } from "@/lib/ports/DataPort";
import { generateBracket, recordWinner } from "@/lib/bracket/generate";
import { shuffleArray } from "@/lib/utils/shuffle";

export const MOCK_STORAGE_KEY = "green-needle:mock-state";

type FolderRecord = Omit<IdeaFolder, "ideas">;

type PersistedState = {
  folders: FolderRecord[];
  ideas: Idea[];
  tournaments: Tournament[];
  participants: Participant[];
  matches: Record<string, Match[]>;
};

let memoryState: PersistedState = {
  folders: [],
  ideas: [],
  tournaments: [],
  participants: [],
  matches: {},
};

let hasLoadedFromStorage = false;

function cloneIdea(idea: Idea): Idea {
  return { ...idea };
}

function cloneFolder(folder: FolderRecord): FolderRecord {
  return { ...folder };
}

function cloneTournament(tournament: Tournament): Tournament {
  return { ...tournament };
}

function cloneParticipant(participant: Participant): Participant {
  return { ...participant };
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

function loadState(): PersistedState {
  if (hasLoadedFromStorage) {
    return memoryState;
  }

  if (typeof window === "undefined") {
    return memoryState;
  }

  try {
    const stored = window.localStorage.getItem(MOCK_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedState;
      memoryState = {
        folders: parsed.folders ?? [],
        ideas: (parsed.ideas ?? []).map((idea) => ({
          ...idea,
          folderId: idea.folderId ?? null,
        })),
        tournaments: parsed.tournaments ?? [],
        participants: parsed.participants ?? [],
        matches: parsed.matches ?? {},
      };
    }
  } catch (error) {
    console.warn("Failed to load mock data", error);
  } finally {
    hasLoadedFromStorage = true;
  }

  return memoryState;
}

function saveState(state: PersistedState) {
  memoryState = state;
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist mock state", error);
  }
}

function nextState(mutator: (draft: PersistedState) => void): PersistedState {
  const state = loadState();
  const draft: PersistedState = {
    folders: state.folders.map(cloneFolder),
    ideas: state.ideas.map(cloneIdea),
    tournaments: state.tournaments.map(cloneTournament),
    participants: state.participants.map(cloneParticipant),
    matches: Object.fromEntries(
      Object.entries(state.matches).map(([id, list]) => [id, list.map(cloneMatch)]),
    ),
  };
  mutator(draft);
  saveState(draft);
  return draft;
}

export function syncMockIdeas(ideas: Idea[]) {
  nextState((draft) => {
    draft.ideas = ideas.map(cloneIdea);
  });
}

function buildFolder(state: PersistedState, folder: FolderRecord): IdeaFolder {
  const ideas = state.ideas
    .filter((idea) => idea.folderId === folder.id)
    .map(cloneIdea)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { ...cloneFolder(folder), ideas };
}

function getParticipantsForTournament(state: PersistedState, tournamentId: string) {
  return state.participants.filter((participant) => participant.tournamentId === tournamentId);
}

function computeSizeSuggestion(count: number) {
  if (count <= 4) return 4;
  const power = Math.pow(2, Math.ceil(Math.log2(Math.max(4, count))));
  return power;
}

function createRoomCode() {
  const base = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `GN-${base}`;
}

function buildTournamentDetails(state: PersistedState, tournament: Tournament): TournamentWithDetails {
  const participants = getParticipantsForTournament(state, tournament.id).map(cloneParticipant);
  return {
    ...cloneTournament(tournament),
    participants,
  };
}

function ensureMatches(state: PersistedState, tournamentId: string): Match[] {
  const matches = state.matches[tournamentId] ?? [];
  return matches.map(cloneMatch);
}

export function getMockDataPort(): DataPort {
  return {
    async listIdeaFolders() {
      const state = loadState();
      return state.folders
        .map((folder) => buildFolder(state, folder))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async createIdeaFolder(input: CreateIdeaFolderInput) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Folder title is required");
      }
      const now = new Date().toISOString();
      const folder: FolderRecord = {
        id: crypto.randomUUID(),
        title,
        description: input.description?.trim() ? input.description.trim() : null,
        theme: input.theme?.trim() ? input.theme.trim() : null,
        color: input.color?.trim() ? input.color.trim() : null,
        icon: input.icon?.trim() ? input.icon.trim() : null,
        createdAt: now,
      };
      const state = nextState((draft) => {
        draft.folders.unshift(cloneFolder(folder));
      });
      return buildFolder(state, folder);
    },

    async updateIdeaFolder(id: string, patch: UpdateIdeaFolderInput) {
      let updated: FolderRecord | null = null;
      const state = nextState((draft) => {
        const folder = draft.folders.find((item) => item.id === id);
        if (!folder) {
          return;
        }
        if (patch.title !== undefined) {
          const trimmed = patch.title.trim();
          if (trimmed) {
            folder.title = trimmed;
          }
        }
        if (patch.description !== undefined) {
          const trimmed = patch.description?.trim();
          folder.description = trimmed ? trimmed : null;
        }
        if (patch.theme !== undefined) {
          const trimmed = patch.theme?.trim();
          folder.theme = trimmed ? trimmed : null;
        }
        if (patch.color !== undefined) {
          const trimmed = patch.color?.trim();
          folder.color = trimmed ? trimmed : null;
        }
        if (patch.icon !== undefined) {
          const trimmed = patch.icon?.trim();
          folder.icon = trimmed ? trimmed : null;
        }
        updated = cloneFolder(folder);
      });
      if (!updated) {
        return null;
      }
      return buildFolder(state, updated);
    },

    async deleteIdeaFolder(id: string) {
      nextState((draft) => {
        draft.folders = draft.folders.filter((folder) => folder.id !== id);
        draft.ideas = draft.ideas.filter((idea) => idea.folderId !== id);
      });
    },

    async listIdeas() {
      const { ideas } = loadState();
      return ideas
        .map(cloneIdea)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async createIdea(input: CreateIdeaInput) {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new Error("Title is required");
      }

      const state = loadState();
      const folder = state.folders.find((item) => item.id === input.folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }

      const idea: Idea = {
        id: crypto.randomUUID(),
        folderId: folder.id,
        title: trimmedTitle,
        description: input.description?.trim() ? input.description.trim() : null,
        createdAt: new Date().toISOString(),
      };

      nextState((draft) => {
        draft.ideas.unshift(cloneIdea(idea));
      });

      return cloneIdea(idea);
    },

    async deleteIdea(id: string) {
      nextState((draft) => {
        draft.ideas = draft.ideas.filter((idea) => idea.id !== id);
      });
    },

    async listTournaments() {
      const { tournaments } = loadState();
      return tournaments
        .map(cloneTournament)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async createTournament(input: CreateTournamentInput) {
      const state = loadState();
      const uniqueIds = Array.from(new Set(input.ideaIds));
      const ideas = uniqueIds
        .map((id) => state.ideas.find((idea) => idea.id === id) ?? null)
        .filter((idea): idea is Idea => idea !== null);

      if (ideas.length < 4) {
        throw new Error("Select at least four ideas to create a tournament.");
      }

      const shuffledIdeas = shuffleArray(ideas);

      const createdAt = new Date().toISOString();
      const tournament: Tournament = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "Untitled Tournament",
        visibility: input.visibility,
        status: "draft",
        createdAt,
        sizeSuggestion: computeSizeSuggestion(shuffledIdeas.length),
        ideaCount: shuffledIdeas.length,
        roomCode: createRoomCode(),
      };

      const participants: Participant[] = shuffledIdeas.map((idea, index) => ({
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        ideaId: idea.id,
        ideaTitle: idea.title,
        seed: index + 1,
      }));

      const matches = generateBracket(participants, { shuffle: false });

      nextState((draft) => {
        draft.tournaments.unshift(cloneTournament(tournament));
        draft.participants.push(...participants.map(cloneParticipant));
        draft.matches[tournament.id] = matches.map(cloneMatch);
      });

      return buildTournamentDetails(loadState(), tournament);
    },

    async getTournament(id: string) {
      const state = loadState();
      const tournament = state.tournaments.find((item) => item.id === id);
      if (!tournament) {
        return null;
      }
      return buildTournamentDetails(state, tournament);
    },

    async updateTournamentMeta(id: string, patch: UpdateTournamentMetaInput) {
      let nextTournament: Tournament | null = null;
      nextState((draft) => {
        const current = draft.tournaments.find((item) => item.id === id);
        if (!current) return;
        if (patch.name !== undefined) {
          current.name = patch.name.trim() || current.name;
        }
        if (patch.visibility) {
          current.visibility = patch.visibility;
        }
        if (patch.status) {
          current.status = patch.status;
        }
        nextTournament = cloneTournament(current);
      });

      if (!nextTournament) {
        return null;
      }

      return buildTournamentDetails(loadState(), nextTournament);
    },

    async getParticipants(tournamentId: string) {
      const state = loadState();
      return getParticipantsForTournament(state, tournamentId).map(cloneParticipant);
    },

    async getBracket(tournamentId: string) {
      return ensureMatches(loadState(), tournamentId);
    },

    async saveBracket(tournamentId: string, matches: Match[]) {
      let updated: Match[] = [];
      nextState((draft) => {
        draft.matches[tournamentId] = matches.map(cloneMatch);
        updated = draft.matches[tournamentId].map(cloneMatch);
      });
      return updated;
    },

    async applyMatchResult(tournamentId: string, matchId: string, winnerSide: MatchWinnerSide) {
      const state = loadState();
      const matches = state.matches[tournamentId];
      if (!matches) {
        throw new Error("Tournament bracket not found");
      }

      const nextMatches = recordWinner(matches.map(cloneMatch), matchId, winnerSide);
      nextState((draft) => {
        draft.matches[tournamentId] = nextMatches.map(cloneMatch);
      });

      return nextMatches;
    },

    async reseed(tournamentId: string, participantOrder: string[]) {
      const state = loadState();
      const participants = getParticipantsForTournament(state, tournamentId)
        .map(cloneParticipant)
        .sort((a, b) => participantOrder.indexOf(a.id) - participantOrder.indexOf(b.id));

      participants.forEach((participant, index) => {
        participant.seed = index + 1;
      });

      nextState((draft) => {
        draft.participants = draft.participants.map((participant) => {
          if (participant.tournamentId !== tournamentId) {
            return participant;
          }
          const next = participants.find((item) => item.id === participant.id);
          return next ? cloneParticipant(next) : participant;
        });
        draft.matches[tournamentId] = generateBracket(participants, { shuffle: false }).map(cloneMatch);
      });

      return ensureMatches(loadState(), tournamentId);
    },
  } satisfies DataPort;
}
