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
  UpdateIdeaFolderInput,
} from "@/lib/domain/types";

export interface DataPort {
  listIdeaFolders(): Promise<IdeaFolder[]>;
  createIdeaFolder(input: CreateIdeaFolderInput): Promise<IdeaFolder>;
  updateIdeaFolder(id: string, patch: UpdateIdeaFolderInput): Promise<IdeaFolder | null>;
  deleteIdeaFolder(id: string): Promise<void>;

  listIdeas(): Promise<Idea[]>;
  createIdea(input: CreateIdeaInput): Promise<Idea>;
  deleteIdea(id: string): Promise<void>;

  listTournaments(): Promise<Tournament[]>;
  createTournament(input: CreateTournamentInput): Promise<TournamentWithDetails>;
  getTournament(id: string): Promise<TournamentWithDetails | null>;
  updateTournamentMeta(id: string, patch: UpdateTournamentMetaInput): Promise<TournamentWithDetails | null>;
  deleteTournament(id: string): Promise<void>;

  getParticipants(tournamentId: string): Promise<Participant[]>;
  getBracket(tournamentId: string): Promise<Match[]>;
  saveBracket(tournamentId: string, matches: Match[]): Promise<Match[]>;
  applyMatchResult(tournamentId: string, matchId: string, winnerSide: MatchWinnerSide): Promise<Match[]>;
  reseed(tournamentId: string, participantOrder: string[]): Promise<Match[]>;

  getProfile(): Promise<Profile>;
  updateProfileNickname(nickname: string): Promise<Profile>;
  listFriends(): Promise<Friend[]>;
  addFriend(profileId: string): Promise<Friend>;
  removeFriend(profileId: string): Promise<void>;
  searchProfiles(query: string): Promise<Profile[]>;

  listChatMessages(tournamentId: string): Promise<ChatMessage[]>;
  sendChatMessage(tournamentId: string, content: string): Promise<ChatMessage>;
  subscribeToChatMessages(
    tournamentId: string,
    handler: (message: ChatMessage) => void,
  ): () => void;
}
