-- Drop legacy policies that allowed cross-account access to ideas.
drop policy if exists "ideas readable by all" on public.ideas;

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
end $$;
