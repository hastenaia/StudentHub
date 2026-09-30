"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Note, NoteDraft } from "@/types/study";
import { normalizeCategory } from "@/lib/noteCategories";
import { pdfStoragePath, type PendingPdf } from "@/lib/notesForm";
import { findOrphanPdfs, noteDraftToColumns, noteRowToView } from "@/lib/noteView";

export const notesClientService = {
  async createNote(draft: NoteDraft): Promise<ApiResult<Note>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...noteDraftToColumns(draft), user_id: user.id })
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Note created.", noteRowToView(data));
  },

  async updateNote(id: string, draft: NoteDraft): Promise<ApiResult<Note>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .update(noteDraftToColumns(draft))
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Note updated.", noteRowToView(data));
  },

  async deleteNote(id: string): Promise<ApiResult> {
    const supabase = createClient();
    // note_attachments rows cascade with the note, but the Storage objects don't — collect paths first.
    const { data: attachments } = await supabase.from("note_attachments").select("file_url").eq("note_id", id);
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return fail(error.message);
    const paths = (attachments ?? []).map((a) => a.file_url).filter((p) => !p.startsWith("http"));
    if (paths.length) await supabase.storage.from("notes-pdfs").remove(paths);
    return ok("Note deleted.");
  },

  /** A note's PDFs with 1h signed URLs (the bucket is private). `path` is the storage key, or a legacy absolute URL. */
  async getAttachments(noteId: string): Promise<{ name: string; url: string; path: string }[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("note_attachments").select("file_url, file_name").eq("note_id", noteId);
    if (error || !data?.length) return [];
    const signed = await Promise.all(
      data.map(async (a) => {
        const url = a.file_url.startsWith("http")
          ? a.file_url
          : (await supabase.storage.from("notes-pdfs").createSignedUrl(a.file_url, 3600)).data?.signedUrl;
        return url ? { name: a.file_name, url, path: a.file_url } : null;
      })
    );
    return signed.filter((a) => a !== null);
  },

  /**
   * Uploads a PDF for a note being edited. Its note_attachments row is written on save
   * (`linkAttachments`); an abandoned upload is removed by `discardPdfUploads` or the sweep.
   */
  async uploadPdf(file: File): Promise<ApiResult<{ path: string; url?: string }>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const path = pdfStoragePath(user.id, file.name, Date.now());
    const { error } = await supabase.storage.from("notes-pdfs").upload(path, file, { contentType: "application/pdf" });
    if (error) return fail(error.message);
    const { data } = await supabase.storage.from("notes-pdfs").createSignedUrl(path, 3600);
    return ok("PDF attached.", { path, url: data?.signedUrl });
  },

  /** Records uploaded PDFs as attachments of a saved note. */
  async linkAttachments(noteId: string, files: PendingPdf[]): Promise<ApiResult> {
    if (!files.length) return ok("Nothing to link.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("Not signed in.");
    const { error } = await supabase
      .from("note_attachments")
      .insert(files.map((p) => ({ user_id: user.id, note_id: noteId, file_url: p.path, file_name: p.file_name })));
    return error ? fail(error.message) : ok("Attachments saved.");
  },

  /** Best-effort cleanup of PDFs uploaded during a note edit that was never saved. */
  async discardPdfUploads(paths: string[]): Promise<void> {
    if (!paths.length) return;
    await createClient().storage.from("notes-pdfs").remove(paths);
  },

  /** Deletes saved attachments (rows + Storage objects) by their storage path. */
  async removeAttachments(noteId: string, paths: string[]): Promise<ApiResult> {
    if (!paths.length) return ok("Nothing to remove.");
    const supabase = createClient();
    const { error } = await supabase.from("note_attachments").delete().eq("note_id", noteId).in("file_url", paths);
    if (error) return fail(error.message);
    await supabase.storage.from("notes-pdfs").remove(paths);
    return ok("Attachments removed.");
  },

  /**
   * Removes PDFs in the user's folder that no note_attachments row points to. Catches uploads
   * orphaned by a closed tab mid-edit, which no unload handler can clean up reliably. The age
   * cutoff keeps it away from uploads still pending in an open dialog (possibly another tab).
   */
  async sweepOrphanPdfs(minAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: objects }, { data: rows }] = await Promise.all([
      supabase.storage.from("notes-pdfs").list(user.id, { limit: 1000 }),
      supabase.from("note_attachments").select("file_url"),
    ]);
    if (!objects || !rows) return;
    await notesClientService.discardPdfUploads(findOrphanPdfs(user.id, objects, new Set(rows.map((r) => r.file_url)), Date.now() - minAgeMs));
  },

  /** Renames a category across all of the user's notes, or clears it (`to` = null) — the notes themselves are kept. */
  async renameCategory(from: string, to: string | null): Promise<ApiResult> {
    const supabase = createClient();
    const next = normalizeCategory(to);
    const { error } = await supabase.from("notes").update({ category: next }).eq("category", from);
    if (error) return fail(error.message);
    return ok(next ? `Renamed to “${next}”.` : "Category removed.");
  },

  async toggleFavorite(id: string, favorite: boolean): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("notes").update({ favorite }).eq("id", id);
    if (error) return fail(error.message);
    return ok(favorite ? "Added to favorites" : "Removed from favorites");
  },
};
