# Backend Next: Wiring Supabase

## Tables & data mapping
- **ideas**: `id (uuid PK)`, `owner_id`, `title`, `description`, `created_at`. Maps to `dataPort.listIdeas/createIdea/deleteIdea`.
- **tournaments**: `id`, `owner_id`, `name`, `visibility`, `status`, `room_code`, `size_suggestion`, `created_at`.
- **tournament_participants**: `id`, `tournament_id`, `idea_id`, `seed`, `idea_title_cache`.
- **matches**: `id`, `tournament_id`, `round`, `position`, `status`, `side_a_participant_id`, `side_b_participant_id`, `winner_side`.
- **votes**: `id`, `match_id`, `voter_id`, `side`, `created_at`.

## API wiring plan
| dataPort method | Supabase call |
| --- | --- |
| `listIdeas` | `supabase.from('ideas').select('*').order('created_at', { descending: true })` |
| `createIdea` | insert row into `ideas` with `owner_id = auth.user()` |
| `deleteIdea` | delete where `id` + `owner_id` match |
| `listTournaments` | `supabase.from('tournaments').select('*, participants:tournament_participants(count)').order('created_at', { descending: true })` |
| `createTournament` | RPC or transaction: insert tournament, insert participants, generate matches server-side, return hydrated object |
| `getTournament` | `supabase.from('tournaments').select('*, participants:tournament_participants(*)').eq('id', id).single()` |
| `updateTournamentMeta` | `supabase.from('tournaments').update(patch).eq('id', id)` |
| `getParticipants` | `supabase.from('tournament_participants').select('*').eq('tournament_id', id)` |
| `getBracket` | `supabase.from('matches').select('*').eq('tournament_id', id)` |
| `saveBracket` | bulk `upsert` matches after local adjustments (mainly for status toggles) |
| `applyMatchResult` | RPC to mark winner + advance next match atomically |
| `reseed` | RPC: reorder seeds, regenerate matches server-side |

## Optimistic vs server arbitration
- Safe to stay optimistic: idea CRUD, tournament name/visibility edits.
- Require server arbitration: bracket winner selection, reseeding, vote tallies.
- Voting should insert into `votes` and rely on Postgres functions to compute winners (or queue). Client should subscribe to Realtime to update brackets.

## RLS & auth
- `ideas`, `tournaments`, `tournament_participants`, `matches`: owner has full access. Public tournaments allow `select` to everyone.
- `votes`: enforce one vote per match per `voter_id`; allow `insert` if tournament visibility is public or user owns it.
- Use Supabase auth magic links; ensure `emailRedirectTo` matches `/auth/callback` (no trailing slash mismatch).

## Implementation steps
1. Create RPC to generate bracket and propagate winners (mirrors `generateBracket` logic server-side).
2. Replace `mockDataAdapter` with `supabaseAdapter` in `src/lib/data.ts` when ready.
3. Update client hooks to handle real errors + revalidation (SWR or React Query if allowed later).
4. Wire Realtime channel for match updates + vote counts.
5. Add optimistic guardrails (disable actions until RPC success). 

## References
- [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)
- [PostgREST RPC](https://postgrest.org/en/stable/api.html#stored-procedures)
