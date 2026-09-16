-- Performance indexes for filtered/sorted query patterns.
-- Follows existing non-concurrent style (migrations run in a transaction).

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists flashcards_user_created_idx
  on public.flashcards (user_id, created_at desc);

create index if not exists quizzes_user_created_idx
  on public.quizzes (user_id, created_at desc);

create index if not exists tasks_user_status_completed_idx
  on public.tasks (user_id, status, completed_at);

create index if not exists schedule_user_type_start_idx
  on public.schedule_events (user_id, event_type, start_at);

create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at);
