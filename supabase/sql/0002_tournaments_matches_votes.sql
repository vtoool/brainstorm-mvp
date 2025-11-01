------------------------------------------------------------
-- 0002_tournaments_matches_votes.sql
------------------------------------------------------------
create extension if not exists pgcrypto;

-- 1) Tournaments
create table if not exists public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  visibility  text not null default 'private' check (visibility in ('private','public')),
  status      text not null default 'draft'   check (status in ('draft','active','complete')),
  created_at  timestamptz not null default now(),
  starts_at   timestamptz,
  ends_at     timestamptz
);
alter table public.tournaments enable row level security;

-- 2) Participants (ideas enrolled in a tournament)
create table if not exists public.tournament_participants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  idea_id       uuid not null references public.ideas(id) on delete cascade,
  seed          int,
  created_at    timestamptz not null default now(),
  unique (tournament_id, idea_id)
);
alter table public.tournament_participants enable row level security;

-- 3) Matches (single-elimination, round/position grid)
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         int not null,     -- 1=R16, 2=QF, 3=SF, 4=Final, etc.
  position      int not null,     -- slot within round (1..N)
  left_participant_id  uuid references public.tournament_participants(id) on delete set null,
  right_participant_id uuid references public.tournament_participants(id) on delete set null,
  winner_participant_id uuid references public.tournament_participants(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending','open','closed')),
  opens_at      timestamptz,
  closes_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (tournament_id, round, position)
);
alter table public.matches enable row level security;

-- 4) Votes (one per user per match)
create table if not exists public.votes (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  voter_id   uuid not null references public.profiles(id) on delete cascade,
  choice     text not null check (choice in ('left','right')),
  created_at timestamptz not null default now(),
  unique (match_id, voter_id)
);
alter table public.votes enable row level security;

-- Indexes for common queries
create index if not exists idx_matches_by_tournament_round on public.matches (tournament_id, round, position);
create index if not exists idx_participants_by_tournament  on public.tournament_participants (tournament_id);
create index if not exists idx_votes_by_match              on public.votes (match_id);

-- RLS: tournament ownership and public visibility
drop policy if exists "tournaments owner read/write" on public.tournaments;
drop policy if exists "tournaments public read"      on public.tournaments;

create policy "tournaments owner read/write"
on public.tournaments
for all
using (owner = auth.uid())
with check (owner = auth.uid());

create policy "tournaments public read"
on public.tournaments
for select
using (visibility = 'public' or owner = auth.uid());

-- RLS: participants follow tournament ownership
drop policy if exists "participants owner read/write" on public.tournament_participants;
drop policy if exists "participants public read"      on public.tournament_participants;

create policy "participants owner read/write"
on public.tournament_participants
for all
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.owner = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.owner = auth.uid()
  )
);

create policy "participants public read"
on public.tournament_participants
for select
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and (t.visibility = 'public' or t.owner = auth.uid())
  )
);

-- RLS: matches
drop policy if exists "matches owner read/write" on public.matches;
drop policy if exists "matches public read"      on public.matches;

create policy "matches owner read/write"
on public.matches
for all
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.owner = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.owner = auth.uid()
  )
);

create policy "matches public read"
on public.matches
for select
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and (t.visibility = 'public' or t.owner = auth.uid())
  )
);

-- RLS: votes (any authenticated user can vote, but only once per match)
drop policy if exists "votes read own or public" on public.votes;
drop policy if exists "votes insert once"        on public.votes;

create policy "votes read own or public"
on public.votes
for select
to authenticated
using (
  voter_id = auth.uid() or
  exists (
    select 1 from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.id = match_id and (t.visibility = 'public' or t.owner = auth.uid())
  )
);

create policy "votes insert once"
on public.votes
for insert
to authenticated
with check (voter_id = auth.uid());

-- (Optional) You can later tighten insert to only OPEN matches by adding:
-- and exists(select 1 from public.matches m where m.id = match_id and m.status = 'open')

------------------------------------------------------------
