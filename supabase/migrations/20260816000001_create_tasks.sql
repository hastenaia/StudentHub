-- StudentHub — Module 2: Smart To-Do Tracker
--
-- Run this in the Supabase SQL Editor for project cbdxebzizvgzoupdplvs.
-- Requires handle_updated_at() from the earlier migrations (consolidated.sql).

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  tags text[] not null default '{}',
  due_at timestamptz,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  recurrence_freq text check (recurrence_freq is null or recurrence_freq in ('daily', 'weekly', 'monthly')),
  recurrence_interval integer not null default 1 check (recurrence_interval between 1 and 31),
  recur_until timestamptz,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks owner select" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks owner insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks owner update" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks owner delete" on public.tasks for delete using (auth.uid() = user_id);

drop trigger if exists on_tasks_updated on public.tasks;
create trigger on_tasks_updated before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- Read patterns the tracker uses: status grouping and due-order lists.
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_at);
