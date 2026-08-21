-- Module 3: Focus Timer + Study Stats.
--
-- study_sessions is an append-only log of completed focus/break sessions.
-- Rows are immutable once written (no updated_at trigger needed).

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0),
  kind text not null default 'focus' check (kind in ('focus', 'break')),
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create policy "study_sessions owner select" on public.study_sessions for select using (auth.uid() = user_id);
create policy "study_sessions owner insert" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "study_sessions owner update" on public.study_sessions for update using (auth.uid() = user_id);
create policy "study_sessions owner delete" on public.study_sessions for delete using (auth.uid() = user_id);

create index if not exists study_sessions_user_started_idx
  on public.study_sessions (user_id, started_at desc);
