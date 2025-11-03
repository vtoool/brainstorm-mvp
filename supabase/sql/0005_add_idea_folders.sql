------------------------------------------------------------
-- 0005_add_idea_folders.sql
------------------------------------------------------------
create table if not exists public.idea_folders (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles(id) on delete cascade,
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

create index if not exists idx_idea_folders_owner on public.idea_folders(owner);
create index if not exists idx_ideas_folder on public.ideas(folder_id);

-- RLS for idea_folders
create policy if not exists "idea_folders owner read/write"
  on public.idea_folders
  for all
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Update ideas policies to ensure folder ownership matches
create policy if not exists "ideas insert own folder"
  on public.ideas
  for insert
  with check (
    owner = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.idea_folders f where f.id = folder_id and f.owner = auth.uid()
      )
    )
  );

create policy if not exists "ideas update own folder"
  on public.ideas
  for update
  using (owner = auth.uid())
  with check (
    owner = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.idea_folders f where f.id = folder_id and f.owner = auth.uid()
      )
    )
  );
