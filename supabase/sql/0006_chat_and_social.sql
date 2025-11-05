------------------------------------------------------------
-- 0006_chat_and_social.sql
------------------------------------------------------------
-- Ensure profiles table supports nicknames and timestamps.
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists nickname text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_nickname_unique_ci
  on public.profiles (lower(nickname))
  where nickname is not null;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles read all" on public.profiles;
drop policy if exists "profiles self upsert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles read all"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles self upsert"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles self update"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

------------------------------------------------------------
-- Friendships between users.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner, friend_id),
  check (owner <> friend_id)
);

alter table public.friendships enable row level security;

create index if not exists idx_friendships_owner on public.friendships(owner);
create index if not exists idx_friendships_friend on public.friendships(friend_id);

drop policy if exists "friendships owner read" on public.friendships;
drop policy if exists "friendships owner insert" on public.friendships;
drop policy if exists "friendships owner delete" on public.friendships;

create policy "friendships owner read"
  on public.friendships
  for select
  using (owner = auth.uid());

create policy "friendships owner insert"
  on public.friendships
  for insert
  with check (owner = auth.uid());

create policy "friendships owner delete"
  on public.friendships
  for delete
  using (owner = auth.uid());

------------------------------------------------------------
-- Tournament chat messages.
create table if not exists public.tournament_messages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

alter table public.tournament_messages enable row level security;

create index if not exists idx_tournament_messages_tournament
  on public.tournament_messages (tournament_id, created_at);

drop policy if exists "tournament messages read" on public.tournament_messages;
drop policy if exists "tournament messages insert" on public.tournament_messages;

create policy "tournament messages read"
  on public.tournament_messages
  for select
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and (t.visibility = 'public' or t.owner = auth.uid())
    )
  );

create policy "tournament messages insert"
  on public.tournament_messages
  for insert
  with check (author_id = auth.uid());
------------------------------------------------------------
