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
  section text,
  room text,
  teacher_name text,
  color text,
  credit_hours numeric not null default 3.0 check (credit_hours >= 0),
  manual_grade numeric,                  -- grade points (scale) for manual courses
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
