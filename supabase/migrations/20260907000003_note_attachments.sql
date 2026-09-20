begin;
create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
alter table public.note_attachments enable row level security;
drop policy if exists "note_attachments owner select" on public.note_attachments;
create policy "note_attachments owner select" on public.note_attachments for select using (auth.uid()=user_id);
drop policy if exists "note_attachments owner insert" on public.note_attachments;
create policy "note_attachments owner insert" on public.note_attachments for insert with check (auth.uid()=user_id);
drop policy if exists "note_attachments owner delete" on public.note_attachments;
create policy "note_attachments owner delete" on public.note_attachments for delete using (auth.uid()=user_id);
create index if not exists note_attachments_user_note_idx on public.note_attachments(user_id, note_id);

insert into storage.buckets (id, name, public) values ('notes-pdfs','notes-pdfs', false)
on conflict (id) do nothing;
drop policy if exists "notes-pdfs owner insert" on storage.objects;
create policy "notes-pdfs owner insert" on storage.objects for insert with check (bucket_id='notes-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "notes-pdfs owner select" on storage.objects;
create policy "notes-pdfs owner select" on storage.objects for select using (bucket_id='notes-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "notes-pdfs owner delete" on storage.objects;
create policy "notes-pdfs owner delete" on storage.objects for delete using (bucket_id='notes-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
commit;
