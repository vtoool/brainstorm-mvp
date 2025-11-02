import type {
  CreateIdeaInput,
  CreateTournamentInput,
  Match,
  MatchWinnerSide,
  TournamentWithDetails,
  UpdateTournamentMetaInput,
} from "@/lib/domain/types";
import type { DataPort } from "@/lib/ports/DataPort";

class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `Supabase adapter method "${method}" is not implemented yet. TODO: wire this method to supabase-js using the tables defined in docs/SUPABASE_TODO.md.`,
    );
  }
}

function notImplemented(method: string): never {
  throw new NotImplementedError(method);
}

export function getSupabaseDataPort(): DataPort {
  return {
    async listIdeas() {
      notImplemented("listIdeas");
    },
    async createIdea(_input: CreateIdeaInput) {
      notImplemented("createIdea");
    },
    async deleteIdea(_id: string) {
      notImplemented("deleteIdea");
    },
    async listTournaments() {
      notImplemented("listTournaments");
    },
    async createTournament(_input: CreateTournamentInput): Promise<TournamentWithDetails> {
      notImplemented("createTournament");
    },
    async getTournament(_id: string): Promise<TournamentWithDetails | null> {
      notImplemented("getTournament");
    },
    async updateTournamentMeta(_id: string, _patch: UpdateTournamentMetaInput): Promise<TournamentWithDetails | null> {
      notImplemented("updateTournamentMeta");
    },
    async getParticipants(_tournamentId: string) {
      notImplemented("getParticipants");
    },
    async getBracket(_tournamentId: string): Promise<Match[]> {
      notImplemented("getBracket");
    },
    async saveBracket(_tournamentId: string, _matches: Match[]): Promise<Match[]> {
      notImplemented("saveBracket");
    },
    async applyMatchResult(_tournamentId: string, _matchId: string, _winnerSide: MatchWinnerSide) {
      notImplemented("applyMatchResult");
    },
    async reseed(_tournamentId: string, _participantOrder: string[]) {
      notImplemented("reseed");
    },
  } satisfies DataPort;
}
