-- StudentHub — tighten note_attachments inserts.
-- The old policy only checked user_id = auth.uid(), so a user could attach a row to another
-- user's note_id, or point file_url at another user's storage folder. Require that the note is
-- the caller's own and that file_url is a key inside the caller's own notes-pdfs folder.
-- Existing rows (including legacy absolute-URL ones) are untouched; this only gates new inserts.
begin;
drop policy if exists "note_attachments owner insert" on public.note_attachments;
create policy "note_attachments owner insert" on public.note_attachments for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
    and split_part(file_url, '/', 1) = auth.uid()::text
  );
commit;
