create table if not exists public.idea_folders (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete set null,
  title text not null,
  description text,
  theme text,
  color text,
  icon text,
  created_at timestamptz not null default now()
);

alter table public.idea_folders enable row level security;

alter table public.ideas
  add column if not exists folder_id uuid references public.idea_folders(id) on delete cascade;

create index if not exists idea_folders_owner_idx on public.idea_folders(owner);
create index if not exists ideas_folder_idx on public.ideas(folder_id);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'idea_folders'
      and policyname = 'idea_folders_select_own'
  ) then
    drop policy idea_folders_select_own on public.idea_folders;
  end if;
  create policy idea_folders_select_own on public.idea_folders for select using (owner = auth.uid());

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'idea_folders'
      and policyname = 'idea_folders_modify_own'
  ) then
    drop policy idea_folders_modify_own on public.idea_folders;
  end if;
  create policy idea_folders_modify_own on public.idea_folders for all using (owner = auth.uid()) with check (owner = auth.uid());

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ideas'
      and policyname = 'ideas_insert_own'
  ) then
    drop policy ideas_insert_own on public.ideas;
  end if;
  create policy ideas_insert_own on public.ideas for insert with check (
    owner = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.idea_folders f where f.id = folder_id and f.owner = auth.uid()
      )
    )
  );

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ideas'
      and policyname = 'ideas_update_own'
  ) then
    drop policy ideas_update_own on public.ideas;
  end if;
  create policy ideas_update_own on public.ideas for update using (owner = auth.uid()) with check (
    owner = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.idea_folders f where f.id = folder_id and f.owner = auth.uid()
      )
    )
  );
end $$;
