-- StudentHub — consolidated schema (Phase 1.5)
-- For fresh setups, run this in the Supabase SQL Editor for project cbdxebzizvgzoupdplvs.
-- For incremental changes, prefer the timestamped files in supabase/migrations/.

-- 1. Role enum
do $$
begin
  create type public.user_role as enum ('student', 'teacher', 'admin');
exception
  when duplicate_object then null;
end;
$$;

-- 2. Profiles table (1:1 with auth.users)
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

-- Users can read and update only their own profile
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Auto-create a profile row whenever a new auth user is created.
--    Role is taken from `app_metadata` (admin/service-role only). We never trust
--    `user_metadata` for the role, since that is client-controllable and would
--    allow a self-signed privilege escalation. The same role is written back into
--    `app_metadata` so it appears in the user's JWT for edge/middleware checks.
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

-- 4. Keep updated_at fresh
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
