-- StudentHub — consolidated schema (Phase 1.5 + Module 1: Google integration)
--
-- Single-file version of:
--   migrations/20260811000001_init_profiles.sql
--   migrations/20260811000002_add_role_enum.sql
--   migrations/20260813000001_google_academics.sql
--
-- Run this ONCE in the Supabase SQL Editor for project cbdxebzizvgzoupdplvs
-- (Dashboard → SQL Editor → New query → paste → Run).

-- ============================================================
-- 1. Role enum
-- ============================================================
do $$
begin
  create type public.user_role as enum ('student', 'teacher', 'admin');
exception
  when duplicate_object then null;
end;
$$;

-- ============================================================
-- 2. Profiles table (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'student',
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 3. Auto-create a profile row whenever a new auth user is created.
--    Role comes from app_metadata (admin/service-role only) and is mirrored
--    back into app_metadata so it lands in the JWT for edge/middleware checks.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_role public.user_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::public.user_role,
    'student'::public.user_role
  );
begin
  insert into public.profiles (id, full_name, avatar_url, role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    new_role,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  );

  update auth.users
  set raw_app_meta_data =
    coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', new_role)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 4. Keep updated_at fresh
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 5. Role index for role-scoped queries
create index if not exists profiles_role_idx on public.profiles (role);

-- ============================================================
-- 6. Google integration + academic data model
-- ============================================================
begin;

create table if not exists public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  google_subject text not null unique,
  email text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_expires_at timestamptz not null,
  needs_reconnect boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  google_course_id text,
  source text not null default 'manual' check (source in ('classroom', 'manual')),
  name text not null,
  course_code text,
  course_name text,
  instructor text,
  description text,
  section text,
  room text,
  teacher_name text,
  color text,
  credit_hours numeric not null default 3.0 check (credit_hours >= 0),
  manual_grade numeric,                  -- legacy grade points (soft-ignored)
  target_pct numeric check (target_pct is null or target_pct between 0 and 100),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_course_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  google_course_work_id text,
  title text not null,
  description text,
  due_at timestamptz,
  max_points numeric check (max_points is null or max_points > 0),
  grade numeric,
  submitted boolean not null default false,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_course_work_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  google_announcement_id text,
  text text not null,
  creator_name text,
  publish_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_announcement_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  google_event_id text,
  summary text not null,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_event_id)
);

create table if not exists public.academic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  grade_scale jsonb not null default '{"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0}'::jsonb,
  target_gpa numeric not null default 3.0 check (target_gpa between 0 and 4.333),
  updated_at timestamptz not null default now()
);

-- Row Level Security (owner-only on every table)
alter table public.google_accounts enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.announcements enable row level security;
alter table public.calendar_events enable row level security;
alter table public.academic_settings enable row level security;

create policy "google_accounts owner select"  on public.google_accounts for select  using (auth.uid() = user_id);
create policy "google_accounts owner insert"  on public.google_accounts for insert  with check (auth.uid() = user_id);
create policy "google_accounts owner update"  on public.google_accounts for update  using (auth.uid() = user_id);
create policy "google_accounts owner delete"  on public.google_accounts for delete  using (auth.uid() = user_id);

create policy "courses owner select" on public.courses for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses for update using (auth.uid() = user_id);
create policy "courses owner delete" on public.courses for delete using (auth.uid() = user_id);

create policy "assignments owner select" on public.assignments for select using (auth.uid() = user_id);
create policy "assignments owner insert" on public.assignments for insert with check (auth.uid() = user_id);
create policy "assignments owner update" on public.assignments for update using (auth.uid() = user_id);
create policy "assignments owner delete" on public.assignments for delete using (auth.uid() = user_id);

create policy "announcements owner select" on public.announcements for select using (auth.uid() = user_id);
create policy "announcements owner insert" on public.announcements for insert with check (auth.uid() = user_id);
create policy "announcements owner update" on public.announcements for update using (auth.uid() = user_id);
create policy "announcements owner delete" on public.announcements for delete using (auth.uid() = user_id);

create policy "calendar_events owner select" on public.calendar_events for select using (auth.uid() = user_id);
create policy "calendar_events owner insert" on public.calendar_events for insert with check (auth.uid() = user_id);
create policy "calendar_events owner update" on public.calendar_events for update using (auth.uid() = user_id);
create policy "calendar_events owner delete" on public.calendar_events for delete using (auth.uid() = user_id);

create policy "academic_settings owner select" on public.academic_settings for select using (auth.uid() = user_id);
create policy "academic_settings owner insert" on public.academic_settings for insert with check (auth.uid() = user_id);
create policy "academic_settings owner update" on public.academic_settings for update using (auth.uid() = user_id);
create policy "academic_settings owner delete" on public.academic_settings for delete using (auth.uid() = user_id);

-- Keep updated_at fresh (reuse handle_updated_at from above)
drop trigger if exists on_google_accounts_updated on public.google_accounts;
create trigger on_google_accounts_updated before update on public.google_accounts
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_courses_updated on public.courses;
create trigger on_courses_updated before update on public.courses
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_assignments_updated on public.assignments;
create trigger on_assignments_updated before update on public.assignments
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_announcements_updated on public.announcements;
create trigger on_announcements_updated before update on public.announcements
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_calendar_events_updated on public.calendar_events;
create trigger on_calendar_events_updated before update on public.calendar_events
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_academic_settings_updated on public.academic_settings;
create trigger on_academic_settings_updated before update on public.academic_settings
  for each row execute procedure public.handle_updated_at();

-- Indexes for the read patterns the dashboard uses
create index if not exists courses_user_archived_idx on public.courses (user_id, archived);
create index if not exists assignments_user_due_idx on public.assignments (user_id, due_at);
create index if not exists assignments_course_idx on public.assignments (course_id);
create index if not exists announcements_user_publish_idx on public.announcements (user_id, publish_time desc);
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_at);

commit;

-- ============================================================
-- 7. Module 2: Smart To-Do Tracker
-- ============================================================
begin;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  tags text[] not null default '{}',
  due_at timestamptz,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  recurrence_freq text check (recurrence_freq is null or recurrence_freq in ('daily', 'weekly', 'monthly')),
  recurrence_interval integer not null default 1 check (recurrence_interval between 1 and 31),
  recur_until timestamptz,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks owner select" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks owner insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks owner update" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks owner delete" on public.tasks for delete using (auth.uid() = user_id);

drop trigger if exists on_tasks_updated on public.tasks;
create trigger on_tasks_updated before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_at);

commit;

-- ============================================================
-- 8. Schedule: user-created calendar (separate from Google cache)
-- ============================================================
begin;

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

commit;

-- ============================================================
-- 9. Dashboard Productivity: Focus & Notes
-- ============================================================
begin;

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
  favorite boolean not null default false,
  tags text[] not null default '{}',
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
create index if not exists notes_user_favorite_idx on public.notes (user_id, favorite);

commit;

-- ============================================================
-- 10. Study Hub: Notes enhancements + Flashcards + Quizzes
-- ============================================================
begin;

alter table public.notes add column if not exists favorite boolean not null default false;
alter table public.notes add column if not exists tags text[] not null default '{}';

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  note_id uuid references public.notes (id) on delete set null,
  front text not null,
  back text not null,
  tags text[] not null default '{}',
  is_known boolean not null default false,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;
create policy "flashcards owner select" on public.flashcards for select using (auth.uid() = user_id);
create policy "flashcards owner insert" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "flashcards owner update" on public.flashcards for update using (auth.uid() = user_id);
create policy "flashcards owner delete" on public.flashcards for delete using (auth.uid() = user_id);
drop trigger if exists on_flashcards_updated on public.flashcards;
create trigger on_flashcards_updated before update on public.flashcards for each row execute procedure public.handle_updated_at();
create index if not exists flashcards_user_course_idx on public.flashcards (user_id, course_id);
create index if not exists flashcards_user_known_idx on public.flashcards (user_id, is_known);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;
create policy "quizzes owner select" on public.quizzes for select using (auth.uid() = user_id);
create policy "quizzes owner insert" on public.quizzes for insert with check (auth.uid() = user_id);
create policy "quizzes owner update" on public.quizzes for update using (auth.uid() = user_id);
create policy "quizzes owner delete" on public.quizzes for delete using (auth.uid() = user_id);
drop trigger if exists on_quizzes_updated on public.quizzes;
create trigger on_quizzes_updated before update on public.quizzes for each row execute procedure public.handle_updated_at();

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice','true_false','short_answer')),
  options jsonb,
  correct_answer text not null,
  explanation text,
  position integer not null default 0
);

alter table public.quiz_questions enable row level security;
create policy "quiz_questions owner select" on public.quiz_questions for select using (exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid()));
create policy "quiz_questions owner insert" on public.quiz_questions for insert with check (exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid()));
create policy "quiz_questions owner update" on public.quiz_questions for update using (exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid()));
create policy "quiz_questions owner delete" on public.quiz_questions for delete using (exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid()));

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;
create policy "quiz_attempts owner select" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "quiz_attempts owner insert" on public.quiz_attempts for insert with check (auth.uid() = user_id);

commit;
