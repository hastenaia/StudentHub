-- StudentHub — migration 0002: role enum + RBAC plumbing.
-- Replaces the loose `profiles.role` text column with a constrained enum
-- and honours a `role` provided in user metadata on signup.

-- 1. Create the role enum
do $$
begin
  create type public.user_role as enum ('student', 'teacher', 'admin');
exception
  when duplicate_object then null;
end;
$$;

-- 2. Re-point profiles.role to the new enum (default stays 'student')
alter table public.profiles
  alter column role type public.user_role
  using role::public.user_role;

alter table public.profiles
  alter column role set default 'student';

-- 3. Auto-create a profile on signup. Role is read from `app_metadata`
--    (admin/service-role only) and mirrored back into `app_metadata` so it is
--    carried in the JWT for edge/middleware checks. We never trust the
--    client-controllable `user_metadata` for the role.
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

-- 4. Index on role for role-scoped queries
create index if not exists profiles_role_idx on public.profiles (role);
