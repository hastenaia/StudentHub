"use client";

import * as React from "react";
import { Search, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { notesClientService } from "@/services/notesClient.service";
import { buildNoteSearchIndex, EMPTY_NOTE_FILTERS, filterStudyNotes, type NoteFilters } from "@/lib/notesForm";
import { upsertById } from "@/utils/text";
import { categoryFromFilter, renameCategoryInNotes, summarizeCategories } from "@/lib/noteCategories";
import { NoteCard } from "@/components/study/NoteCard";
import { NotesFilterBar } from "@/components/study/NotesFilterBar";
import { NoteEditorDialog } from "@/components/study/NoteEditorDialog";
import { NoteViewDialog } from "@/components/study/NoteViewDialog";
import type { Note, CourseOption } from "@/types/study";

/** `notes`/`setNotes` are owned by StudyHubView so saves made in the AI tab show up here. */
interface Props { notes: Note[]; setNotes: React.Dispatch<React.SetStateAction<Note[]>>; courses: CourseOption[] }

/** null = no editor; `note: null` = a new note. */
type Editor = { note: Note | null } | null;

export function NotesTab({ notes, setNotes, courses }: Props) {
  const { toast } = useToast();
  const [filters, setFilters] = React.useState<NoteFilters>(EMPTY_NOTE_FILTERS);
  const [editor, setEditor] = React.useState<Editor>(null);
  const [viewing, setViewing] = React.useState<Note | null>(null);

  // Uploads orphaned by a tab closed mid-edit; open editors discard their own on unmount.
  React.useEffect(() => void notesClientService.sweepOrphanPdfs(), []);

  const allTags = React.useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);
  const { categories, uncategorized } = React.useMemo(() => summarizeCategories(notes), [notes]);
  const searchIndex = React.useMemo(() => buildNoteSearchIndex(notes), [notes]);
  const deferredFilters = React.useDeferredValue(filters);
  const filtered = React.useMemo(() => filterStudyNotes(notes, searchIndex, deferredFilters), [notes, searchIndex, deferredFilters]);

  const handleSaved = (note: Note) => {
    setNotes((prev) => upsertById(prev, note));
    setEditor(null);
  };

  const handleDelete = async (id: string) => {
    const res = await notesClientService.deleteNote(id);
    if (!res.success) return toast({ title: "Failed", description: res.message, variant: "error" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast({ title: "Note deleted", variant: "success" });
  };

  const renameCategory = async (from: string, next: string | null): Promise<boolean> => {
    const res = await notesClientService.renameCategory(from, next);
    if (!res.success) {
      toast({ title: "Couldn't update category", description: res.message, variant: "error" });
      return false;
    }
    setNotes((prev) => renameCategoryInNotes(prev, from, next));
    setFilters((f) => ({ ...f, category: next ?? "all" }));
    toast({ title: res.message ?? "Category updated", variant: "success" });
    return true;
  };

  const toggleFavorite = async (note: Note) => {
    const res = await notesClientService.toggleFavorite(note.id, !note.favorite);
    if (res.success) setNotes((prev) => upsertById(prev, { ...note, favorite: !note.favorite }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search title, content, tags, course…" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} className="pl-9" />
        </div>
        <Button onClick={() => setEditor({ note: null })}>
          <Plus className="h-4 w-4" /> New Note
        </Button>
      </div>

      <NotesFilterBar
        filters={filters}
        onChange={setFilters}
        courses={courses}
        tags={allTags}
        categories={categories}
        uncategorized={uncategorized}
        onRenameCategory={renameCategory}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No notes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onView={() => setViewing(note)}
              onEdit={() => setEditor({ note })}
              onDelete={() => handleDelete(note.id)}
              onToggleFavorite={() => toggleFavorite(note)}
            />
          ))}
        </div>
      )}

      {editor && (
        <NoteEditorDialog
          note={editor.note}
          // New notes start in the category being browsed.
          defaultCategory={categoryFromFilter(filters.category)}
          categories={categories.map((c) => c.name)}
          courses={courses}
          onSaved={handleSaved}
          onClose={() => setEditor(null)}
        />
      )}
      {viewing && (
        <NoteViewDialog
          note={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null);
            setEditor({ note: viewing });
          }}
          onDelete={() => {
            setViewing(null);
            void handleDelete(viewing.id);
          }}
        />
      )}
    </div>
  );
}
