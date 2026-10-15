-- Guard recurrence_days to the valid range (weekday 0-6 / day of month 1-31).
-- `all()` over an empty array is true, so the default '{}' passes.
alter table public.tasks
  drop constraint if exists tasks_recurrence_days_range;
alter table public.tasks
  add constraint tasks_recurrence_days_range
  check (0 <= all(recurrence_days) and 31 >= all(recurrence_days));
