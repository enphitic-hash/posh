-- Posh Passport: database schema (Supabase / Postgres).
-- One generic table holds every record kind (properties, tenants, payments, txns, cards, taps, ...).
-- Run this once in the Supabase SQL editor of a new project, then put the project URL and
-- publishable (anon) key in src/config.ts or in VITE_SUPABASE_URL / VITE_SUPABASE_KEY.
-- The app fills an empty table with the sample data on first load (or run seed.sql).

create table if not exists public.posh_records (
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
comment on table public.posh_records is 'Posh Passport demo (sample data only). Safe to drop.';
create index if not exists posh_records_updated on public.posh_records (updated_at desc);

alter table public.posh_records enable row level security;
-- Needed so realtime DELETE events carry the old row's kind and id.
alter table public.posh_records replica identity full;

-- Demo policies: anyone with the publishable key can read and write.
-- For production, replace these with policies tied to Supabase Auth users and roles.
drop policy if exists "posh demo read" on public.posh_records;
drop policy if exists "posh demo insert" on public.posh_records;
drop policy if exists "posh demo update" on public.posh_records;
drop policy if exists "posh demo delete" on public.posh_records;
create policy "posh demo read" on public.posh_records for select to anon, authenticated using (true);
create policy "posh demo insert" on public.posh_records for insert to anon, authenticated with check (kind ~ '^[a-z]{2,24}$');
create policy "posh demo update" on public.posh_records for update to anon, authenticated using (true) with check (kind ~ '^[a-z]{2,24}$');
create policy "posh demo delete" on public.posh_records for delete to anon, authenticated using (true);

-- Live updates between phones and Posh Office.
do $$ begin
  alter publication supabase_realtime add table public.posh_records;
exception when duplicate_object then null; end $$;
