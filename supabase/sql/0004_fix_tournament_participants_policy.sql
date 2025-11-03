create or replace function public.tournament_is_owned_by_auth(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists(
    select 1
    from public.tournaments t
    where t.id = target and t.owner = auth.uid()
  );
end;
$$;

drop policy if exists "participants owner read/write" on public.tournament_participants;

create policy "participants owner manage"
on public.tournament_participants
for all
using (public.tournament_is_owned_by_auth(tournament_id))
with check (public.tournament_is_owned_by_auth(tournament_id));
grant execute on function public.tournament_is_owned_by_auth(uuid) to authenticated;
grant execute on function public.tournament_is_owned_by_auth(uuid) to anon;
