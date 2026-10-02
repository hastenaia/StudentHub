-- StudentHub — persistent cache and history for AI answers.
--
-- Every prompt-driven answer (explain, summarize, flashcards, quiz, study plan)
-- is stored so it survives a refresh and can be reused: asking the same
-- question again returns the stored answer without calling the provider.
-- `wellness-tip` is not stored — it is a passive suggestion, not a prompt.
--
-- `cache_key` is a sha256 of the action plus the exact inputs sent to the model
-- (see lib/ai/cacheKey.ts). Because the source note's resolved text is part of
-- that input, editing a note changes its key and invalidates its own answers.
-- The unique (user_id, cache_key) makes a re-ask or a regeneration update the
-- existing row, so history holds one row per distinct question.
--
-- Rows never expire; the user deletes them from the Study Hub AI tab.

begin;

create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cache_key text not null,
  action text not null check (action in ('explain', 'summarize', 'flashcards', 'quiz', 'plan')),
  label text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cache_key)
);

create index if not exists ai_cache_user_created_idx on public.ai_cache (user_id, created_at desc);

alter table public.ai_cache enable row level security;
drop policy if exists "ai_cache owner select" on public.ai_cache;
create policy "ai_cache owner select" on public.ai_cache for select using (auth.uid() = user_id);
drop policy if exists "ai_cache owner insert" on public.ai_cache;
create policy "ai_cache owner insert" on public.ai_cache for insert with check (auth.uid() = user_id);
-- Regeneration upserts onto an existing row, and ON CONFLICT DO UPDATE needs an update policy to pass RLS.
drop policy if exists "ai_cache owner update" on public.ai_cache;
create policy "ai_cache owner update" on public.ai_cache for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ai_cache owner delete" on public.ai_cache;
create policy "ai_cache owner delete" on public.ai_cache for delete using (auth.uid() = user_id);

drop trigger if exists on_ai_cache_updated on public.ai_cache;
create trigger on_ai_cache_updated before update on public.ai_cache
  for each row execute procedure public.handle_updated_at();

commit;