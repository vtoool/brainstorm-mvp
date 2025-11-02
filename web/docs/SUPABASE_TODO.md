# Supabase TODOs

## Tables
1. `ideas`
   - Columns: `id uuid primary key default gen_random_uuid()`, `owner_id uuid references auth.users`, `title text`, `description text`, `created_at timestamptz default now()`
   - RLS: owner full access; `select` for owner only (until sharing).

2. `tournaments`
   - Columns: `id uuid`, `owner_id`, `name`, `visibility text check in ('private','public')`, `status text check in ('draft','active','complete')`, `room_code text unique`, `size_suggestion int`, `created_at timestamptz default now()`
   - RLS: owner full access; `select` allowed when `visibility = 'public'`.

3. `tournament_participants`
   - Columns: `id uuid`, `tournament_id`, `idea_id`, `seed int`, `idea_title_cache text`
   - RLS: join tournaments for ownership/public read.

4. `matches`
   - Columns: `id uuid`, `tournament_id`, `round int`, `position int`, `status text`, `side_a_participant_id uuid`, `side_b_participant_id uuid`, `winner_side text`
   - RLS: read if tournament visible; update if owner.

5. `votes`
   - Columns: `id uuid`, `match_id`, `voter_id uuid`, `side text`, `created_at timestamptz default now()`
   - Unique constraint `(match_id, voter_id)` to prevent duplicates.
   - RLS: allow insert when tournament is public or owned; select aggregated by owner.

## Policies
- For each table: `using (auth.uid() = owner_id)` and `with check` same; plus `visibility = 'public'` for public read.
- Votes: `with check (auth.uid() = voter_id)` and match/tournament visibility guard via join.

## Edge functions / RPC
- `create_tournament(payload)` to wrap inserts + bracket creation.
- `apply_match_winner(match_id, side)` to set winner, propagate to next match (transaction, handles byes).
- `reseed_tournament(tournament_id, participant_order uuid[])` to reorder seeds + regenerate matches.
- `compute_open_matches(tournament_id)` optional view for quick access.

## Realtime & subscriptions
- Channels: `tournaments:id=eq.{id}` for status updates, `matches:tournament_id=eq.{id}` for bracket updates, `votes:match_id=eq.{id}` for live tallies.
- Client should subscribe after switching to Supabase adapter.

## Migration ordering
1. Create tables + constraints.
2. Seed RLS policies (owner + public visibility).
3. Add RPC functions (PL/pgSQL) for bracket logic.
4. Wire supabase-js adapter and gradually replace mock.
