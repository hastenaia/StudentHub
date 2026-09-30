-- StudentHub — Gamification: XP, streaks, badges (FR-02 / FR-14).
--
-- Points are computed server-side from the row being rewarded, so the client
-- can't choose them. Clients call one of three SECURITY DEFINER RPCs:
--   award_task_xp(task_id)       10 base (high 15, urgent 20), +5 if finished late
--   award_focus_xp(session_id)   15 for a 25+ min session, else 1 per 5 min; 60/day cap
--   award_journal_xp(entry_date) 2 per day with a non-empty journal
-- Each award is idempotent through xp_ledger(user_id, dedupe_key). A guard
-- trigger rejects direct client writes to the profile counters.

begin;

-- 0. Upgrade path from the unmerged WIP migration (20260915000001), if it ran.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'xp_points') then
    alter table public.profiles rename column xp_points to total_xp;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'streak_count') then
    alter table public.profiles rename column streak_count to current_streak;
  end if;
end $$;
drop function if exists public.award_xp(text, integer, text);

-- 1. Profile counters
alter table public.profiles
  add column if not exists total_xp integer not null default 0 check (total_xp >= 0),
  add column if not exists current_streak integer not null default 0 check (current_streak >= 0),
  add column if not exists longest_streak integer not null default 0 check (longest_streak >= 0),
  add column if not exists last_active_date date;

-- 2. Badge catalogue. xp_threshold > 0 → unlocked by total XP; 0 → unlocked by an event.
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  xp_threshold integer not null default 0 check (xp_threshold >= 0),
  created_at timestamptz not null default now()
);

insert into public.badges (slug, name, description, xp_threshold) values
  ('first-task', 'First Task', 'Complete your first task.', 0),
  ('focus-25', 'Deep Focus', 'Finish a focus session of 25 minutes or more.', 0),
  ('streak-7', 'Week Warrior', 'Stay active 7 days in a row.', 0),
  ('xp-100', 'Rising Scholar', 'Earn 100 XP.', 100),
  ('xp-500', 'Dedicated Learner', 'Earn 500 XP.', 500),
  ('xp-1000', 'Study Master', 'Earn 1000 XP.', 1000)
on conflict (slug) do update
  set name = excluded.name, description = excluded.description, xp_threshold = excluded.xp_threshold;

-- 3. Earned badges and the XP ledger (written only by the functions below)
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  dedupe_key text not null,
  points integer not null check (points >= 0),
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists xp_ledger_user_created_idx on public.xp_ledger (user_id, created_at desc);
create index if not exists user_badges_user_idx on public.user_badges (user_id);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.xp_ledger enable row level security;

drop policy if exists "badges readable by all" on public.badges;
create policy "badges readable by all" on public.badges for select using (true);
drop policy if exists "user_badges owner select" on public.user_badges;
create policy "user_badges owner select" on public.user_badges for select using (auth.uid() = user_id);
drop policy if exists "xp_ledger owner select" on public.xp_ledger;
create policy "xp_ledger owner select" on public.xp_ledger for select using (auth.uid() = user_id);

-- 4. Guard: profile counters change only inside grant_xp (transaction-local bypass flag).
create or replace function public.guard_profile_xp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.total_xp is distinct from old.total_xp
      or new.current_streak is distinct from old.current_streak
      or new.longest_streak is distinct from old.longest_streak
      or new.last_active_date is distinct from old.last_active_date)
     and coalesce(current_setting('app.xp_guard_bypass', true), '') <> '1' then
    raise exception 'XP counters may only be changed by the award functions.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profiles_xp_guard on public.profiles;
create trigger on_profiles_xp_guard
  before update on public.profiles
  for each row execute procedure public.guard_profile_xp();

-- 5. The user's local calendar date (profiles.timezone), falling back to UTC.
create or replace function public.user_local_date(p_user_id uuid)
returns date
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = p_user_id;
  return (now() at time zone coalesce(nullif(v_tz, ''), 'UTC'))::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- 6. Internal: ledger insert + counters + streak + badges. Not callable by clients.
create or replace function public.grant_xp(
  p_user_id uuid,
  p_dedupe_key text,
  p_points integer,
  p_reason text,
  p_event_badge text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_today date := public.user_local_date(p_user_id);
  v_last date;
  v_xp integer := 0;
  v_streak integer := 0;
  v_new text[] := '{}';
begin
  insert into public.xp_ledger (user_id, dedupe_key, points, reason)
  values (p_user_id, p_dedupe_key, greatest(p_points, 0), p_reason)
  on conflict (user_id, dedupe_key) do nothing;

  if not found then
    select total_xp, current_streak into v_xp, v_streak from public.profiles where id = p_user_id;
    return jsonb_build_object('awarded', false, 'xp', 0, 'total_xp', coalesce(v_xp, 0),
                              'streak', coalesce(v_streak, 0), 'new_badges', '[]'::jsonb);
  end if;

  select last_active_date into v_last from public.profiles where id = p_user_id for update;
  perform set_config('app.xp_guard_bypass', '1', true);

  update public.profiles
  set total_xp = total_xp + greatest(p_points, 0),
      last_active_date = v_today,
      current_streak = case
        when v_last = v_today then current_streak
        when v_last = v_today - 1 then current_streak + 1
        else 1
      end,
      longest_streak = greatest(longest_streak, case
        when v_last = v_today then current_streak
        when v_last = v_today - 1 then current_streak + 1
        else 1
      end)
  where id = p_user_id
  returning total_xp, current_streak into v_xp, v_streak;

  perform set_config('app.xp_guard_bypass', '', true);

  with earned as (
    select b.id, b.name from public.badges b
    where (b.xp_threshold > 0 and b.xp_threshold <= v_xp)
       or (b.slug = 'streak-7' and v_streak >= 7)
       or (b.slug = p_event_badge)
  ),
  inserted as (
    insert into public.user_badges (user_id, badge_id)
    select p_user_id, id from earned
    on conflict (user_id, badge_id) do nothing
    returning badge_id
  )
  select coalesce(array_agg(e.name), '{}') into v_new
  from inserted i join earned e on e.id = i.badge_id;

  return jsonb_build_object('awarded', true, 'xp', greatest(p_points, 0), 'total_xp', v_xp,
                            'streak', v_streak, 'new_badges', to_jsonb(v_new));
end;
$$;

revoke all on function public.grant_xp(uuid, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.user_local_date(uuid) from public, anon, authenticated;

-- 7. Client-callable award RPCs
create or replace function public.award_task_xp(p_task_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t record;
  v_key text;
  v_late boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated.'; end if;
  select priority, status, due_at, completed_at, recurrence_freq into t
  from public.tasks where id = p_task_id and user_id = v_uid;
  if not found then raise exception 'Task not found.'; end if;

  if t.recurrence_freq is null then
    if t.status <> 'done' then raise exception 'Task is not completed.'; end if;
    v_key := 'task:' || p_task_id;  -- once per task, however often it is re-opened
    v_late := t.due_at is not null and t.completed_at is not null and t.completed_at > t.due_at;
  else
    -- Recurring tasks roll forward instead of staying done: at most one award per task per day.
    v_key := 'task:' || p_task_id || ':' || public.user_local_date(v_uid);
  end if;

  return public.grant_xp(
    v_uid, v_key,
    (case t.priority when 'urgent' then 20 when 'high' then 15 else 10 end) + (case when v_late then 5 else 0 end),
    'task', 'first-task');
end;
$$;

create or replace function public.award_focus_xp(p_session_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_minutes integer;
  v_points integer;
  v_today date;
  v_used integer;
begin
  if v_uid is null then raise exception 'Not authenticated.'; end if;
  select duration_minutes into v_minutes
  from public.focus_sessions where id = p_session_id and user_id = v_uid;
  if not found then raise exception 'Focus session not found.'; end if;

  v_points := case when v_minutes >= 25 then 15 else v_minutes / 5 end;
  v_today := public.user_local_date(v_uid);
  select coalesce(sum(points), 0) into v_used from public.xp_ledger
  where user_id = v_uid and reason = 'focus'
    and created_at >= now() - interval '2 days'
    and (created_at at time zone coalesce(nullif((select timezone from public.profiles where id = v_uid), ''), 'UTC'))::date = v_today;
  v_points := least(v_points, greatest(60 - v_used, 0));

  return public.grant_xp(v_uid, 'focus:' || p_session_id, v_points, 'focus',
                         case when v_minutes >= 25 then 'focus-25' end);
end;
$$;

create or replace function public.award_journal_xp(p_entry_date date)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated.'; end if;
  if not exists (select 1 from public.wellness_entries
                 where user_id = v_uid and entry_date = p_entry_date
                   and coalesce(btrim(journal), '') <> '') then
    raise exception 'No journal entry for that day.';
  end if;
  return public.grant_xp(v_uid, 'journal:' || p_entry_date, 2, 'journal');
end;
$$;

revoke all on function public.award_task_xp(uuid) from public, anon;
revoke all on function public.award_focus_xp(uuid) from public, anon;
revoke all on function public.award_journal_xp(date) from public, anon;
grant execute on function public.award_task_xp(uuid) to authenticated;
grant execute on function public.award_focus_xp(uuid) to authenticated;
grant execute on function public.award_journal_xp(date) to authenticated;

commit;
