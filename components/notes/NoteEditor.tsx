"use client";
import * as React from "react";
import { Bold, Italic, Heading1, List, Tag, Eye, Edit3, Folder, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { MAX_CATEGORY_LENGTH } from "@/lib/noteCategories";
import type { Note, NoteDraft } from "@/types/study";

interface NoteEditorProps {
  /** null = new, unsaved note. Remount (via `key`) to switch notes. */
  note: Note | null;
  defaultCategory: string | null;
  categories: string[];
  onSave: (draft: NoteDraft) => Promise<boolean>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}

export function NoteEditor({ note, defaultCategory, categories, onSave, onDelete, onCancel }: NoteEditorProps) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const [title, setTitle] = React.useState(note?.title ?? "");
  const [body, setBody] = React.useState(note?.content ?? "");
  const [tags, setTags] = React.useState(note?.tags.join(", ") ?? "");
  const [category, setCategory] = React.useState(note ? note.category ?? "" : defaultCategory ?? "");
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const listId = React.useId();

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      title: title.trim() || "Untitled note",
      content: body,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      category,
      // updateNote writes course_id unconditionally, so pass the existing one through.
      courseId: note?.courseId ?? null,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-brand-royal" /> {note ? note.title : "New note"}
        </CardTitle>
        <CardDescription>
          Markdown · Categories · Tags{note?.courseName ? ` · ${note.courseName}` : ""}
        </CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>Edit</Button>
          <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}><Eye className="h-4 w-4" /> Preview</Button>
          <span className="ml-auto flex gap-1">
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Bold className="h-3 w-3" /> Bold</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Italic className="h-3 w-3" /> Italic</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Heading1 className="h-3 w-3" /> H1</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><List className="h-3 w-3" /> List</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" maxLength={120} aria-label="Title" />
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-gray-400" />
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list={listId}
            maxLength={MAX_CATEGORY_LENGTH}
            placeholder="Category — pick one or type a new one (optional)"
            aria-label="Category"
          />
          <datalist id={listId}>
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-400" />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags comma separated: exam, formulas" aria-label="Tags" />
        </div>
        {mode === "edit" ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} maxLength={10000} aria-label="Note content" className="w-full flex-1 rounded-md border border-gray-300 bg-white p-3 text-sm text-brand-dark placeholder:text-gray-400 focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal" placeholder="Write in Markdown… Supports **bold**, *italic*, # headings, - lists, > quotes" />
        ) : (
          <div className="flex-1 rounded-md border border-gray-200 bg-brand-gray/40 p-4 text-sm leading-6 text-brand-dark">
            <NoteMarkdown content={body} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} isLoading={saving} disabled={deleting}>{note ? "Save note" : "Create note"}</Button>
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>}
          {onDelete && (
            <span className="ml-auto flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-gray-500">Delete this note permanently?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} isLoading={deleting}>Delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)} disabled={saving}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
