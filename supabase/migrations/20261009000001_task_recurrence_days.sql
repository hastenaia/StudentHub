-- Specific days for weekly/monthly recurring tasks.
-- weekly: weekdays 0 (Sun) - 6 (Sat); monthly: days of month 1 - 31. Empty = repeat from the due date.
alter table public.tasks
  add column if not exists recurrence_days integer[] not null default '{}';
