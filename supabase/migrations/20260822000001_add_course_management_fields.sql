-- StudentHub — migration 0006: Course management fields
--
-- PHASE 2 — Course Management
-- Adds missing course fields required for course management:
--   - course_code  : short code like "CS101"
--   - course_name  : canonical name (spec) — kept in sync with `name`
--   - instructor   : canonical instructor (spec) — kept in sync with `teacher_name`
--   - description  : free-form course description
--
-- Strategy: soft-add columns and backfill from existing `name`/`teacher_name`
-- so existing data (including Google Classroom sync) is preserved.
-- Both naming variants are kept for backward compatibility (spec requires
-- course_code/course_name/instructor/description; legacy code uses
-- name/teacher_name). Application layer writes to both.

begin;

-- Add new columns if not exists
alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists course_name text;
alter table public.courses add column if not exists instructor text;
alter table public.courses add column if not exists description text;

-- Backfill canonical fields from legacy fields where null
update public.courses set course_name = name where course_name is null and name is not null;
update public.courses set instructor = teacher_name where instructor is null and teacher_name is not null;

commit;
