export type Visibility = "private" | "public";

export type TournamentStatus = "draft" | "active" | "complete";

export type RoundStatus = "pending" | "open" | "closed";

export type MatchWinnerSide = "a" | "b";

export interface Idea {
  id: string;
  folderId: string | null;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface IdeaFolder {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  ideas: Idea[];
}

export interface Tournament {
  id: string;
  name: string;
  visibility: Visibility;
  status: TournamentStatus;
  createdAt: string;
  sizeSuggestion: number;
  ideaCount: number;
  roomCode: string;
}

export interface Participant {
  id: string;
  tournamentId: string;
  ideaId: string;
  ideaTitle: string;
  seed: number;
}

export interface MatchSide {
  participantId: string | null;
  sourceMatchId: string | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  status: RoundStatus;
  sides: {
    a: MatchSide;
    b: MatchSide;
  };
  winnerSide: MatchWinnerSide | null;
}

export interface TournamentWithDetails extends Tournament {
  participants: Participant[];
}

export interface CreateIdeaInput {
  folderId: string;
  title: string;
  description?: string;
}

export interface CreateIdeaFolderInput {
  title: string;
  description?: string;
  theme?: string;
  color?: string;
  icon?: string;
}

export interface UpdateIdeaFolderInput {
  title?: string;
  description?: string | null;
  theme?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface CreateTournamentInput {
  name: string;
  visibility: Visibility;
  ideaIds: string[];
  sizeSuggestion?: number;
}

export interface UpdateTournamentMetaInput {
  name?: string;
  visibility?: Visibility;
  status?: TournamentStatus;
}
