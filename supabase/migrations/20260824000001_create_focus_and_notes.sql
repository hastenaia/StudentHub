-- StudentHub — Module 5: Focus & Notes for Dashboard
--
-- Creates `focus_sessions` and `notes` tables to power the productivity dashboard:
-- Focus Today (minutes/sessions/streak), Study Activity (completed tasks, study sessions, notes),
-- Quick Actions (Create Note), and dashboard verification that data changes on create/complete.

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  task_id uuid references public.tasks (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;
alter table public.notes enable row level security;

create policy "focus_sessions owner select" on public.focus_sessions for select using (auth.uid() = user_id);
create policy "focus_sessions owner insert" on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "focus_sessions owner update" on public.focus_sessions for update using (auth.uid() = user_id);
create policy "focus_sessions owner delete" on public.focus_sessions for delete using (auth.uid() = user_id);

create policy "notes owner select" on public.notes for select using (auth.uid() = user_id);
create policy "notes owner insert" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes owner update" on public.notes for update using (auth.uid() = user_id);
create policy "notes owner delete" on public.notes for delete using (auth.uid() = user_id);

drop trigger if exists on_notes_updated on public.notes;
create trigger on_notes_updated before update on public.notes
  for each row execute procedure public.handle_updated_at();

create index if not exists focus_sessions_user_started_idx on public.focus_sessions (user_id, started_at desc);
create index if not exists focus_sessions_user_task_idx on public.focus_sessions (user_id, task_id);
create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);
create index if not exists notes_user_course_idx on public.notes (user_id, course_id);
