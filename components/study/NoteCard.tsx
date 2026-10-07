"use client";

import { Star, StarOff, Pencil, Trash2, Tag, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownPreview } from "@/components/study/MarkdownPreview";
import type { Note } from "@/types/study";

interface Props {
  note: Note;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export function NoteCard({ note, onView, onEdit, onDelete, onToggleFavorite }: Props) {
  return (
    <Card className="relative flex flex-col transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-brand-royal/40">
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-brand-dark">
            {/* Stretched over the whole card so clicking anywhere opens the note. */}
            <button type="button" onClick={onView} className="text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:content-['']">
              {note.title}
            </button>
          </h3>
          <button onClick={onToggleFavorite} aria-label="Favorite" aria-pressed={note.favorite} className={`relative z-10 ${note.favorite ? "text-amber-500" : "text-gray-300"}`}>
            {note.favorite ? <Star className="h-4 w-4 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
          </button>
        </div>
        {note.content && (
          <div className="line-clamp-3 text-xs text-gray-600">
            <MarkdownPreview content={note.content.slice(0, 200)} />
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {note.category && (
            <span className="inline-flex items-center gap-1 rounded bg-brand-royal/10 px-1.5 py-0.5 text-[11px] text-brand-royal">
              <Folder className="h-3 w-3" /> {note.category}
            </span>
          )}
          {note.courseName && <span className="rounded bg-brand-gray px-1.5 py-0.5 text-[11px] text-gray-600">{note.courseName}</span>}
          {note.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">
              <Tag className="h-3 w-3" /> {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
          <Button variant="ghost" size="sm" className="relative z-10" onClick={onEdit} aria-label={`Edit ${note.title}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="relative z-10 text-red-600" onClick={onDelete} aria-label={`Delete ${note.title}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
