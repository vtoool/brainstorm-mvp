create extension if not exists "pgcrypto";

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  round int not null,
  a_id uuid references public.ideas(id) on delete cascade,
  b_id uuid references public.ideas(id) on delete cascade,
  winner_id uuid references public.ideas(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter uuid references auth.users(id) on delete cascade,
  choice uuid not null references public.ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(match_id, voter)
);

alter table public.ideas   enable row level security;
alter table public.matches enable row level security;
alter table public.votes   enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ideas' and policyname='ideas_select_own') then
    create policy ideas_select_own on public.ideas for select using (auth.uid() = owner);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ideas' and policyname='ideas_insert_own') then
    create policy ideas_insert_own on public.ideas for insert with check (owner = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ideas' and policyname='ideas_update_own') then
    create policy ideas_update_own on public.ideas for update using (owner = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ideas' and policyname='ideas_delete_own') then
    create policy ideas_delete_own on public.ideas for delete using (owner = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='matches_select_all') then
    create policy matches_select_all on public.matches for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='matches_insert_owner') then
    create policy matches_insert_owner on public.matches for insert with check (created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='matches_update_owner') then
    create policy matches_update_owner on public.matches for update using (created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='matches_delete_owner') then
    create policy matches_delete_owner on public.matches for delete using (created_by = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_select_all') then
    create policy votes_select_all on public.votes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_insert_self') then
    create policy votes_insert_self on public.votes for insert with check (voter = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_update_self') then
    create policy votes_update_self on public.votes for update using (voter = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='votes' and policyname='votes_delete_self') then
    create policy votes_delete_self on public.votes for delete using (voter = auth.uid());
  end if;
end $$;

alter table public.votes   replica identity full;
alter table public.matches replica identity full;
create publication if not exists supabase_realtime;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.matches;
