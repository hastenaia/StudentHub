-- StudentHub — Module 3: Schedule (user-created calendar)
--
-- Creates `schedule_events` for the student calendar. Separate from
-- `calendar_events` (which is the Google Calendar read-only cache that gets
-- wiped/replaced on every sync). This preserves Google integration while
-- allowing full CRUD on user events with proper RLS and course association.

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  location text,
  event_type text not null default 'other' check (event_type in ('class','assignment','exam','study_session','personal','other')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

alter table public.schedule_events enable row level security;

create policy "schedule_events owner select" on public.schedule_events for select using (auth.uid() = user_id);
create policy "schedule_events owner insert" on public.schedule_events for insert with check (auth.uid() = user_id);
create policy "schedule_events owner update" on public.schedule_events for update using (auth.uid() = user_id);
create policy "schedule_events owner delete" on public.schedule_events for delete using (auth.uid() = user_id);

drop trigger if exists on_schedule_events_updated on public.schedule_events;
create trigger on_schedule_events_updated before update on public.schedule_events
  for each row execute procedure public.handle_updated_at();

create index if not exists schedule_events_user_start_idx on public.schedule_events (user_id, start_at);
create index if not exists schedule_events_user_course_idx on public.schedule_events (user_id, course_id);
create index if not exists schedule_events_user_type_idx on public.schedule_events (user_id, event_type);
