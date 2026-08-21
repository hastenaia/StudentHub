-- StudentHub — Module 6: Study Hub
--
-- Notes enhancements + Flashcards + Quizzes + AI support tables
-- Extends `notes` with favorite/tags, creates `flashcards` and quiz tables.
-- All tables are owner-scoped via RLS (auth.uid() = user_id).

-- Extend notes
alter table public.notes add column if not exists favorite boolean not null default false;
alter table public.notes add column if not exists tags text[] not null default '{}';

create index if not exists notes_user_favorite_idx on public.notes (user_id, favorite);
create index if not exists notes_user_tags_idx on public.notes using gin (tags);

-- Flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  note_id uuid references public.notes (id) on delete set null,
  front text not null,
  back text not null,
  tags text[] not null default '{}',
  is_known boolean not null default false,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;
create policy "flashcards owner select" on public.flashcards for select using (auth.uid() = user_id);
create policy "flashcards owner insert" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "flashcards owner update" on public.flashcards for update using (auth.uid() = user_id);
create policy "flashcards owner delete" on public.flashcards for delete using (auth.uid() = user_id);
drop trigger if exists on_flashcards_updated on public.flashcards;
create trigger on_flashcards_updated before update on public.flashcards for each row execute procedure public.handle_updated_at();
create index if not exists flashcards_user_course_idx on public.flashcards (user_id, course_id);
create index if not exists flashcards_user_note_idx on public.flashcards (user_id, note_id);
create index if not exists flashcards_user_known_idx on public.flashcards (user_id, is_known);

-- Quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;
create policy "quizzes owner select" on public.quizzes for select using (auth.uid() = user_id);
create policy "quizzes owner insert" on public.quizzes for insert with check (auth.uid() = user_id);
create policy "quizzes owner update" on public.quizzes for update using (auth.uid() = user_id);
create policy "quizzes owner delete" on public.quizzes for delete using (auth.uid() = user_id);
drop trigger if exists on_quizzes_updated on public.quizzes;
create trigger on_quizzes_updated before update on public.quizzes for each row execute procedure public.handle_updated_at();
create index if not exists quizzes_user_course_idx on public.quizzes (user_id, course_id);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice','true_false','short_answer')),
  options jsonb,
  correct_answer text not null,
  explanation text,
  position integer not null default 0
);

alter table public.quiz_questions enable row level security;
create policy "quiz_questions owner select" on public.quiz_questions for select using (
  exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "quiz_questions owner insert" on public.quiz_questions for insert with check (
  exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "quiz_questions owner update" on public.quiz_questions for update using (
  exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
);
create policy "quiz_questions owner delete" on public.quiz_questions for delete using (
  exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;
create policy "quiz_attempts owner select" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "quiz_attempts owner insert" on public.quiz_attempts for insert with check (auth.uid() = user_id);
create policy "quiz_attempts owner select quiz owner" on public.quiz_attempts for select using (
  exists (select 1 from public.quizzes where quizzes.id = quiz_attempts.quiz_id and quizzes.user_id = auth.uid())
);
create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id);
