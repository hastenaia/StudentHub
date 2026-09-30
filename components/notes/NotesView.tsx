"use client";
import * as React from "react";
import { FileText, Search, Plus, Folder, FolderOpen, Inbox, Pencil, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { AIAssistantTab } from "@/components/study/AIAssistantTab";
import { notesClientService } from "@/services/notesClient.service";
import { filterNotes, normalizeCategory, summarizeCategories, type CategoryFilter } from "@/lib/noteCategories";
import { useToast } from "@/hooks/useToast";
import type { CourseOption, Note, NoteDraft } from "@/types/study";

/** "new" = an unsaved draft in the editor; nothing is written until Save. */
type Selection = string | "new" | null;

export function NotesView({ initialNotes, courses }: { initialNotes: Note[]; courses: CourseOption[] }) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [selectedId, setSelectedId] = React.useState<Selection>(initialNotes[0]?.id ?? null);
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [query, setQuery] = React.useState("");
  const [renaming, setRenaming] = React.useState<{ from: string; to: string } | null>(null);

  const { categories, uncategorized } = React.useMemo(() => summarizeCategories(notes), [notes]);
  const filtered = React.useMemo(() => filterNotes(notes, category, query), [notes, category, query]);
  const selected = selectedId === "new" ? null : notes.find((n) => n.id === selectedId) ?? null;

  const handleSave = async (draft: NoteDraft): Promise<boolean> => {
    const res = selected ? await notesClientService.updateNote(selected.id, draft) : await notesClientService.createNote(draft);
    if (!res.success || !res.data) {
      toast({ title: "Couldn't save note", description: res.message, variant: "error" });
      return false;
    }
    const saved = res.data;
    // The client service can't resolve course names; keep the ones we already had.
    const merged: Note = selected ? { ...saved, courseName: selected.courseName, courseColor: selected.courseColor } : saved;
    setNotes((prev) => [merged, ...prev.filter((n) => n.id !== merged.id)]);
    setSelectedId(merged.id);
    toast({ title: selected ? "Note saved" : "Note created", description: merged.title, variant: "success" });
    return true;
  };

  // AI "Save as new note": the client service can't resolve course names, so fill them from the page's courses.
  const handleAINoteCreated = (note: Note) => {
    const course = note.courseId ? courses.find((c) => c.id === note.courseId) : undefined;
    setNotes((prev) => [{ ...note, courseName: course?.name ?? null, courseColor: course?.color ?? null }, ...prev]);
  };

  const handleDelete = async (id: string) => {
    const res = await notesClientService.deleteNote(id);
    if (!res.success) {
      toast({ title: "Couldn't delete note", description: res.message, variant: "error" });
      return;
    }
    const rest = notes.filter((n) => n.id !== id);
    setNotes(rest);
    setSelectedId(filterNotes(rest, category, query)[0]?.id ?? null);
    toast({ title: "Note deleted", variant: "success" });
  };

  const applyCategoryChange = async (from: string, to: string | null) => {
    const next = normalizeCategory(to);
    if (next === from) return setRenaming(null);
    const res = await notesClientService.renameCategory(from, next);
    if (!res.success) {
      toast({ title: "Couldn't update category", description: res.message, variant: "error" });
      return;
    }
    setNotes((prev) => prev.map((n) => (n.category === from ? { ...n, category: next } : n)));
    if (category === from) setCategory(next ?? "all");
    setRenaming(null);
    toast({ title: res.message ?? "Category updated", variant: "success" });
  };

  const removeCategory = (name: string, count: number) => {
    if (!window.confirm(`Remove category “${name}”? Its ${count} note${count === 1 ? "" : "s"} will be kept as uncategorized.`)) return;
    void applyCategoryChange(name, null);
  };

  const filterButton = (value: CategoryFilter, label: string, count: number, icon: React.ReactNode) => (
    <button
      onClick={() => setCategory(value)}
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${category === value ? "bg-brand-royal/10 font-medium text-brand-royal" : "text-brand-dark hover:bg-brand-gray/60"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs text-gray-400">{count}</span>
    </button>
  );

  return (
    <div className="space-y-6">
    <AIAssistantTab notes={notes} courses={courses} onNoteCreated={handleAINoteCreated} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-1">
        <div className="flex justify-end">
          <Button onClick={() => setSelectedId("new")}><Plus className="h-4 w-4" /> New note</Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Folder className="h-4 w-4 text-brand-royal" /> Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {filterButton("all", "All notes", notes.length, <FileText className="h-4 w-4 shrink-0" />)}
            {categories.map(({ name, count }) =>
              renaming?.from === name ? (
                <form
                  key={name}
                  className="flex items-center gap-1 py-0.5"
                  onSubmit={(e) => { e.preventDefault(); void applyCategoryChange(name, renaming.to); }}
                >
                  <Input autoFocus value={renaming.to} maxLength={40} onChange={(e) => setRenaming({ from: name, to: e.target.value })} className="h-8" aria-label={`Rename ${name}`} />
                  <Button type="submit" size="sm" variant="outline" aria-label="Save category name"><Check className="h-4 w-4" /></Button>
                  <Button type="button" size="sm" variant="outline" aria-label="Cancel rename" onClick={() => setRenaming(null)}><X className="h-4 w-4" /></Button>
                </form>
              ) : (
                <div key={name} className="group flex items-center gap-1">
                  {filterButton(name, name, count, category === name ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />)}
                  <button onClick={() => setRenaming({ from: name, to: name })} className="rounded p-1 text-gray-400 opacity-0 hover:text-brand-royal focus:opacity-100 group-hover:opacity-100" aria-label={`Rename category ${name}`}><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeCategory(name, count)} className="rounded p-1 text-gray-400 opacity-0 hover:text-red-500 focus:opacity-100 group-hover:opacity-100" aria-label={`Remove category ${name}`}><X className="h-3.5 w-3.5" /></button>
                </div>
              )
            )}
            {filterButton(null, "Uncategorized", uncategorized, <Inbox className="h-4 w-4 shrink-0" />)}
            {categories.length === 0 && <p className="px-2 pt-2 text-xs text-gray-400">Give a note a category in the editor to create one.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes, tags, content…" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((n) => (
              <button key={n.id} onClick={() => setSelectedId(n.id)} className={`w-full rounded-md border px-3 py-3 text-left ${selectedId === n.id ? "border-brand-royal bg-brand-royal/5" : "border-gray-100 bg-white hover:bg-brand-gray/40"}`}>
                <p className="truncate text-sm font-medium text-brand-dark">{n.title}</p>
                <p className="truncate text-xs text-gray-500">
                  {[n.category ?? "Uncategorized", n.courseName, n.tags.length ? n.tags.join(", ") : null].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">{notes.length === 0 ? "No notes yet — create your first one." : "No notes match."}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedId === "new" || selected ? (
          <NoteEditor
            key={selected?.id ?? "new"}
            note={selected}
            defaultCategory={typeof category === "string" && category !== "all" ? category : null}
            categories={categories.map((c) => c.name)}
            onSave={handleSave}
            onDelete={selected ? () => handleDelete(selected.id) : undefined}
            onCancel={selected ? undefined : () => setSelectedId(notes[0]?.id ?? null)}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-gray-500">
              {notes.length === 0 ? "You don't have any notes yet." : "Select a note"}
              <div className="mt-4"><Button onClick={() => setSelectedId("new")}><Plus className="h-4 w-4" /> New note</Button></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}
