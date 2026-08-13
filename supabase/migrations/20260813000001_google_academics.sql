-- StudentHub — migration 0003: Google integration + academic data model.
--
-- Adds everything Module 1 (Academic Dashboard & GPA Calculator) needs:
--   - google_accounts    : OAuth tokens (encrypted at rest), expiry, last sync time
--   - courses            : classes from Google Classroom OR manually created
--   - assignments        : course work (due dates, points, grades) per course
--   - announcements      : Classroom stream announcements per course
--   - calendar_events    : snapshot of the linked Google Calendar (rolling window)
--   - academic_settings  : per-user GPA grade scale + target GPA
--
-- Tokens are encrypted/decrypted in the app layer (AES-256-GCM using the
-- GOOGLE_TOKEN_ENCRYPTION_KEY env var) so the plaintext key never lives in
-- Postgres. The secret is never returned to the browser.

begin;

-- 1. google_accounts --------------------------------------------------------
create table if not exists public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  google_subject text not null unique,   -- Google's opaque, stable user id
  email text,                            -- linked account email, for display only
  access_token_enc text not null,        -- AES-256-GCM ciphertext
  refresh_token_enc text not null,       -- AES-256-GCM ciphertext
  token_expires_at timestamptz not null,
  needs_reconnect boolean not null default false, -- set when a refresh fails
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. courses ----------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  google_course_id text,                 -- null for manually created courses
  source text not null default 'manual' check (source in ('classroom', 'manual')),
  name text not null,
  section text,
  room text,
  teacher_name text,
  color text,
  credit_hours numeric not null default 3.0 check (credit_hours >= 0),
  manual_grade numeric,                  -- grade points (scale) for manual courses
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Many NULL or multiple NULLs are allowed for manual courses (they have no
  -- google_course_id), so the unique index still lets users create several.
  unique (user_id, google_course_id)
);

-- 3. assignments ------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  google_course_work_id text,            -- null for manual assignments
  title text not null,
  description text,
  due_at timestamptz,
  max_points numeric check (max_points is null or max_points > 0),
  grade numeric,                         -- earned points, null until graded
  submitted boolean not null default false,
  state text,                            -- raw Classroom submission state
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_course_work_id)
);

-- 4. announcements ----------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  google_announcement_id text,
  text text not null,
  creator_name text,
  publish_time timestamptz,              -- actual announcement creation time
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_announcement_id)
);

-- 5. calendar_events --------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  google_event_id text,                  -- stable Google event id
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

-- 6. academic_settings ------------------------------------------------------
create table if not exists public.academic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  grade_scale jsonb not null default '{"A":4,"A-":3.7,"B+":3.3,"B":3,"B-":2.7,"C+":2.3,"C":2,"C-":1.7,"D+":1.3,"D":1,"D-":0.7,"F":0}'::jsonb,
  target_gpa numeric not null default 3.0 check (target_gpa between 0 and 4.333),
  updated_at timestamptz not null default now()
);

-- 7. Row Level Security (owner-only on every table) -------------------------
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

-- 8. Keep updated_at fresh (reuse the existing helper from migration 0001) --
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

-- 9. Indexes for the read patterns the dashboard uses -----------------------
create index if not exists courses_user_archived_idx on public.courses (user_id, archived);
create index if not exists assignments_user_due_idx on public.assignments (user_id, due_at);
create index if not exists assignments_course_idx on public.assignments (course_id);
create index if not exists announcements_user_publish_idx on public.announcements (user_id, publish_time desc);
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_at);

commit;