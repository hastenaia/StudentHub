"use client";

import * as React from "react";
import { notesClientService } from "@/services/notesClient.service";
import {
  findUnlinkedAttachments,
  linkedAttachments,
  resolveLinks,
  splitKeptDropped,
  toUrlMap,
  validatePdf,
  type DialogPdf,
  type PendingPdf,
} from "@/lib/notesForm";
import { fail, ok, type ApiResult } from "@/types/api";

/**
 * PDF attachments for one note editor session. Uploads stay pending until `commit`; whatever is
 * still pending when the editor unmounts (cancel, close, navigation) is discarded. A closed tab
 * can't run that cleanup, so the orphan sweep catches it.
 */
export function useNoteAttachments(noteId: string | null) {
  const [saved, setSaved] = React.useState<DialogPdf[]>([]);
  const [pending, setPending] = React.useState<PendingPdf[]>([]);
  const [urlCache, setUrlCache] = React.useState<Record<string, string>>({});
  const pendingRef = React.useRef<PendingPdf[]>([]);

  React.useEffect(() => {
    if (!noteId) return;
    void notesClientService.getAttachments(noteId).then((out) => {
      setUrlCache((prev) => ({ ...prev, ...toUrlMap(out) }));
      setSaved(out);
    });
  }, [noteId]);

  React.useEffect(() => () => void notesClientService.discardPdfUploads(pendingRef.current.map((p) => p.path)), []);

  const setPendingBoth = (next: PendingPdf[]) => {
    pendingRef.current = next;
    setPending(next);
  };

  /** Uploads `file`; on success the caller links it into the note content by `path`. */
  const attach = async (file: File): Promise<ApiResult<{ path: string }>> => {
    const invalid = validatePdf(file);
    if (invalid) return fail(invalid);
    const res = await notesClientService.uploadPdf(file);
    if (!res.success || !res.data) return fail(res.message ?? "Upload failed");
    const { path, url } = res.data;
    if (url) setUrlCache((prev) => ({ ...prev, [path]: url }));
    setPendingBoth([...pendingRef.current, { path, file_name: file.name }]);
    return ok("PDF attached (max 10MB)", { path });
  };

  /** Attachments follow the links in the saved content: new linked uploads are recorded, removed links drop their PDF. */
  const commit = async (savedNoteId: string, content: string): Promise<ApiResult> => {
    const { kept, dropped } = splitKeptDropped(content, pendingRef.current);
    setPendingBoth([]);
    void notesClientService.discardPdfUploads(dropped);
    const results = await Promise.all([
      notesClientService.linkAttachments(savedNoteId, kept),
      notesClientService.removeAttachments(savedNoteId, findUnlinkedAttachments(content, saved)),
    ]);
    return results.find((r) => !r.success) ?? ok("Attachments saved.");
  };

  return {
    attach,
    commit,
    linked: (content: string) => linkedAttachments(content, saved, pending, urlCache),
    resolve: (content: string) => resolveLinks(content, urlCache),
  };
}
