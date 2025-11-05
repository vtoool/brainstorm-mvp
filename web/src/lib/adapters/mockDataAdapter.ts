"use client";

import {
  type ChatMessage,
  type CreateIdeaFolderInput,
  type CreateIdeaInput,
  type CreateTournamentInput,
  type Friend,
  type Idea,
  type IdeaFolder,
  type Match,
  type MatchWinnerSide,
  type Participant,
  type Profile,
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

type StoredProfile = Profile;
type StoredFriend = Friend;
type StoredMessage = ChatMessage;

type PersistedState = {
  folders: FolderRecord[];
  ideas: Idea[];
  tournaments: Tournament[];
  participants: Participant[];
  matches: Record<string, Match[]>;
  profile: StoredProfile;
  friends: StoredFriend[];
  chatByTournament: Record<string, StoredMessage[]>;
};

const directoryTimestamp = new Date().toISOString();

const MOCK_DIRECTORY: StoredProfile[] = [
  {
    id: "mock-user",
    email: "mock@example.com",
    nickname: "MockUser",
    createdAt: directoryTimestamp,
    updatedAt: directoryTimestamp,
  },
  {
    id: "mock-friend-nova",
    email: "nova@example.com",
    nickname: "Nova",
    createdAt: directoryTimestamp,
    updatedAt: directoryTimestamp,
  },
  {
    id: "mock-friend-echo",
    email: "echo@example.com",
    nickname: "Echo",
    createdAt: directoryTimestamp,
    updatedAt: directoryTimestamp,
  },
  {
    id: "mock-friend-lyra",
    email: "lyra@example.com",
    nickname: "Lyra",
    createdAt: directoryTimestamp,
    updatedAt: directoryTimestamp,
  },
];

let memoryState: PersistedState = {
  folders: [],
  ideas: [],
  tournaments: [],
  participants: [],
  matches: {},
  profile: cloneProfile(MOCK_DIRECTORY[0] ?? {
    id: "mock-user",
    email: "mock@example.com",
    nickname: "MockUser",
    createdAt: directoryTimestamp,
    updatedAt: directoryTimestamp,
  }),
  friends: [],
  chatByTournament: {},
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

function cloneProfile(profile: StoredProfile): StoredProfile {
  return { ...profile };
}

function cloneFriend(friend: StoredFriend): StoredFriend {
  return { ...friend };
}

function cloneMessage(message: StoredMessage): StoredMessage {
  return { ...message };
}

function findDirectoryProfileById(id: string): StoredProfile | null {
  return MOCK_DIRECTORY.find((profile) => profile.id === id) ?? null;
}

function searchDirectoryByNickname(query: string): StoredProfile[] {
  if (!query.trim()) {
    return [];
  }
  const normalized = query.trim().toLowerCase();
  return MOCK_DIRECTORY.filter((profile) =>
    (profile.nickname ?? "").toLowerCase().includes(normalized),
  );
}

function syncDirectoryProfile(updated: StoredProfile) {
  const index = MOCK_DIRECTORY.findIndex((profile) => profile.id === updated.id);
  if (index !== -1) {
    MOCK_DIRECTORY[index] = cloneProfile(updated);
  }
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
        tournaments: (parsed.tournaments ?? []).map((tournament) => ({
          ...tournament,
          ownerId: tournament.ownerId ?? (parsed.profile?.id ?? memoryState.profile.id),
        })),
        participants: parsed.participants ?? [],
        matches: parsed.matches ?? {},
        profile: parsed.profile
          ? {
              ...parsed.profile,
              nickname: parsed.profile.nickname ?? null,
              email: parsed.profile.email ?? null,
            }
          : cloneProfile(memoryState.profile),
        friends: (parsed.friends ?? []).map((friend) => ({
          profileId: friend.profileId,
          nickname: friend.nickname ?? null,
          email: friend.email ?? null,
          addedAt: friend.addedAt,
        })),
        chatByTournament: Object.fromEntries(
          Object.entries(parsed.chatByTournament ?? {}).map(([id, list]) => [
            id,
            list.map((message) => ({
              ...message,
              authorNickname: message.authorNickname ?? null,
            })),
          ]),
        ),
      };
      syncDirectoryProfile(memoryState.profile);
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
    profile: cloneProfile(state.profile),
    friends: state.friends.map(cloneFriend),
    chatByTournament: Object.fromEntries(
      Object.entries(state.chatByTournament).map(([id, list]) => [id, list.map(cloneMessage)]),
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
  const base = cloneTournament(tournament);
  base.ideaCount = participants.length;
  return {
    ...base,
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
      const state = loadState();
      return state.tournaments
        .map((tournament) => {
          const clone = cloneTournament(tournament);
          clone.ideaCount = getParticipantsForTournament(state, tournament.id).length;
          return clone;
        })
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
        ownerId: state.profile.id,
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

    async deleteTournament(id: string) {
      nextState((draft) => {
        draft.tournaments = draft.tournaments.filter((item) => item.id !== id);
        draft.participants = draft.participants.filter((participant) => participant.tournamentId !== id);
        delete draft.matches[id];
        delete draft.chatByTournament[id];
      });
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

    async getProfile() {
      const state = loadState();
      return cloneProfile(state.profile);
    },

    async updateProfileNickname(nickname: string) {
      const trimmed = nickname.trim();
      if (trimmed.length < 2) {
        throw new Error("Nickname must be at least two characters long.");
      }
      const state = loadState();
      const conflict = MOCK_DIRECTORY.some(
        (profile) => profile.id !== state.profile.id && (profile.nickname ?? "").toLowerCase() === trimmed.toLowerCase(),
      );
      if (conflict) {
        throw new Error("That nickname is already taken in the mock directory.");
      }
      let updated: StoredProfile | null = null;
      nextState((draft) => {
        draft.profile = {
          ...draft.profile,
          nickname: trimmed,
          updatedAt: new Date().toISOString(),
        };
        updated = cloneProfile(draft.profile);
      });
      if (!updated) {
        throw new Error("Failed to update nickname.");
      }
      syncDirectoryProfile(updated);
      return updated;
    },

    async listFriends() {
      const state = loadState();
      return state.friends
        .map(cloneFriend)
        .sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? ""));
    },

    async addFriend(profileId: string) {
      const state = loadState();
      if (!profileId) {
        throw new Error("Select a profile to add as a friend.");
      }
      if (profileId === state.profile.id) {
        throw new Error("You can’t add yourself as a friend.");
      }
      const directoryProfile = findDirectoryProfileById(profileId);
      if (!directoryProfile) {
        throw new Error("Profile not found in the mock directory.");
      }
      let nextFriend: StoredFriend | null = null;
      nextState((draft) => {
        const existing = draft.friends.find((friend) => friend.profileId === profileId);
        if (existing) {
          nextFriend = cloneFriend(existing);
          return;
        }
        const created: StoredFriend = {
          profileId,
          nickname: directoryProfile.nickname ?? null,
          email: directoryProfile.email ?? null,
          addedAt: new Date().toISOString(),
        };
        draft.friends.push(cloneFriend(created));
        nextFriend = created;
      });
      if (!nextFriend) {
        throw new Error("Failed to add friend.");
      }
      return cloneFriend(nextFriend);
    },

    async removeFriend(profileId: string) {
      nextState((draft) => {
        draft.friends = draft.friends.filter((friend) => friend.profileId !== profileId);
      });
    },

    async searchProfiles(query: string) {
      const state = loadState();
      const matches = searchDirectoryByNickname(query).map((profile) => {
        if (profile.id === state.profile.id) {
          return cloneProfile(state.profile);
        }
        return cloneProfile(profile);
      });
      return matches;
    },

    async listChatMessages(tournamentId: string) {
      const state = loadState();
      const messages = state.chatByTournament[tournamentId] ?? [];
      return messages
        .map(cloneMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    async sendChatMessage(tournamentId: string, content: string) {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error("Message cannot be empty.");
      }
      const state = loadState();
      if (!state.profile.nickname || state.profile.nickname.trim().length < 2) {
        throw new Error("Set a nickname in settings before chatting.");
      }
      const message: StoredMessage = {
        id: crypto.randomUUID(),
        tournamentId,
        authorId: state.profile.id,
        authorNickname: state.profile.nickname,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      nextState((draft) => {
        const existing = draft.chatByTournament[tournamentId] ?? [];
        const next = [...existing.map(cloneMessage), message];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        draft.chatByTournament[tournamentId] = next;
      });
      return cloneMessage(message);
    },

    subscribeToChatMessages(_tournamentId: string, _handler: (message: ChatMessage) => void) {
      return () => {
        // No live updates in mock mode.
      };
    },
  } satisfies DataPort;
}
