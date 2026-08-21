-- StudentHub — Phase 10: Settings Cleanup
-- Add profile timezone and UI preferences (no GPA/grades).
-- Preferences are stored on profiles for RLS simplicity (owner-only via existing policies).

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.profiles
  add column if not exists theme text not null default 'system' check (theme in ('light','dark','system'));

alter table public.profiles
  add column if not exists default_calendar_view text not null default 'month' check (default_calendar_view in ('month','week','day','agenda'));

alter table public.profiles
  add column if not exists default_task_view text not null default 'kanban' check (default_task_view in ('kanban','list'));

alter table public.profiles
  add column if not exists notifications_enabled boolean not null default true;
