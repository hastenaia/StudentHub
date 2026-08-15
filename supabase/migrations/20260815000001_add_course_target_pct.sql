-- StudentHub — migration 0004: per-course grade goal.
--
-- Adds `target_pct` to courses so each course can carry its own grade goal
-- (0-100, nullable). The grades page feeds this into `assignmentProjection`
-- to show "you need X% on the remaining work to hit your target".
-- Null means "use the default" (90).

begin;

alter table public.courses
  add column if not exists target_pct numeric
  check (target_pct is null or target_pct between 0 and 100);

commit;
