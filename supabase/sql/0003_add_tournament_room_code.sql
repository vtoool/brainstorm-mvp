------------------------------------------------------------
-- 0003_add_tournament_room_code.sql
------------------------------------------------------------
-- Extend tournaments with optional room code and bracket size metadata.
alter table public.tournaments
  add column if not exists room_code text,
  add column if not exists size_suggestion int;

create unique index if not exists tournaments_room_code_unique
  on public.tournaments (room_code)
  where room_code is not null;
