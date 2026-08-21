-- StudentHub — Module 8: Wellness
--
-- Creates `wellness_entries` for daily mood check-in and journal.
-- Stores healthy study habit data, NOT medical diagnosis.
-- One entry per user per day (upsert on entry_date).
-- RLS ensures private wellness data.

create table if not exists public.wellness_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default (current_date),
  mood smallint not null check (mood between 1 and 5),
  journal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.wellness_entries enable row level security;

create policy "wellness_entries owner select" on public.wellness_entries for select using (auth.uid() = user_id);
create policy "wellness_entries owner insert" on public.wellness_entries for insert with check (auth.uid() = user_id);
create policy "wellness_entries owner update" on public.wellness_entries for update using (auth.uid() = user_id);
create policy "wellness_entries owner delete" on public.wellness_entries for delete using (auth.uid() = user_id);

drop trigger if exists on_wellness_entries_updated on public.wellness_entries;
create trigger on_wellness_entries_updated before update on public.wellness_entries for each row execute procedure public.handle_updated_at();

create index if not exists wellness_entries_user_date_idx on public.wellness_entries (user_id, entry_date desc);
