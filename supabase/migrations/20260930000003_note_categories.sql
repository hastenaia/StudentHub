-- StudentHub — user-defined categories for notes.
--
-- A category is a free-text label on the note (one per note, optional), so
-- categories exist as long as some note uses them. Renaming or removing a
-- category is a bulk update of this column; removing it keeps the notes.
-- `lib/noteCategories.ts` normalizes the value (trimmed, collapsed spaces,
-- ≤ 40 chars) before it is written.

begin;

alter table public.notes
  add column if not exists category text
  check (category is null or (char_length(category) between 1 and 40));

create index if not exists notes_user_category_idx on public.notes (user_id, category);

commit;
