-- Ensure tournaments table exists with baseline structure for environments
-- that started from the initial MVP schema.
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'draft' check (status in ('draft','active','complete')),
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz
);

-- Add optional room code and size suggestion metadata for tournaments.
alter table public.tournaments
  add column if not exists room_code text,
  add column if not exists size_suggestion int;

-- Ensure shared room codes remain unique when present.
create unique index if not exists tournaments_room_code_unique
  on public.tournaments (room_code)
  where room_code is not null;
