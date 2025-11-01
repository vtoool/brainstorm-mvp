# Supabase setup

Run once in Supabase SQL editor; do not commit credentials.

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  updated_at timestamptz not null default now()
);

alter table public.ideas
  alter column owner set default auth.uid();
```
