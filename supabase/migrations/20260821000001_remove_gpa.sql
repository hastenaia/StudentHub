-- Remove the GPA system.
--
-- Drops academic settings (target GPA + grading scale), credit hours, manual
-- grades and per-course grade targets. Manual-source courses existed only to
-- feed GPA math and are deleted along with their data.

delete from public.courses where source = 'manual';

alter table public.courses
  drop column if exists credit_hours,
  drop column if exists manual_grade,
  drop column if exists target_pct;

drop table if exists public.academic_settings cascade;
