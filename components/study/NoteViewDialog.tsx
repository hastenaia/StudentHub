"use client";

import * as React from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/study/MarkdownPreview";
import { notesClientService } from "@/services/notesClient.service";
import { resolveLinks, toUrlMap, type DialogPdf } from "@/lib/notesForm";
import type { Note } from "@/types/study";

/** Read-only note view; attachment links resolve once their signed URLs load. */
export function NoteViewDialog({
  note,
  onClose,
  onEdit,
  onDelete,
}: {
  note: Note;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pdfs, setPdfs] = React.useState<DialogPdf[]>([]);

  React.useEffect(() => {
    void notesClientService.getAttachments(note.id).then(setPdfs);
  }, [note.id]);

  const content = resolveLinks(note.content ?? "", toUrlMap(pdfs));
  const meta = [note.category, note.courseName, new Date(note.updatedAt).toLocaleDateString()].filter(Boolean).join(" • ");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={note.title} className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-dark">{note.title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500">{meta}</p>
        <div className="mt-4 rounded border bg-brand-gray/20 p-4">
          <MarkdownPreview content={content} />
        </div>
        {pdfs.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500">Attachments</p>
            {pdfs.map((a) => (
              <a key={a.url} href={a.url} target="_blank" rel="noopener" className="block text-xs text-brand-royal underline">
                {a.name}
              </a>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((t) => (
            <span key={t} className="rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
