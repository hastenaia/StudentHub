-- StudentHub — per-assignment weight for 0–100 course progress (FR-04).
--
-- `lib/progress.ts` scores a course as the weighted mean of grade/max_points
-- over graded assignments. Default 1 keeps every existing row equally
-- weighted. The Classroom sync never writes this column, so a user-set
-- weight survives re-syncs.

begin;

alter table public.assignments
  add column if not exists weight numeric not null default 1
  check (weight > 0);

commit;
