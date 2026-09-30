import type { NoteFormValues } from "@/lib/validations/study";
import type { Note, NoteDraft } from "@/types/study";
import { matchesCategoryFilter, normalizeCategory } from "@/lib/noteCategories";
import { matchesCourseFilter } from "@/lib/courseView";
import { parseTags } from "@/utils/text";

export interface PendingPdf {
  path: string;
  file_name: string;
}

export interface DialogPdf {
  name: string;
  url: string;
  path: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const toUrlMap = (list: { url: string; path: string }[]) =>
  Object.fromEntries(list.filter((a) => !a.path.startsWith("http")).map((a) => [a.path, a.url]));

const hasLink = (content: string, path: string) => content.includes(`(attachment:${path})`);

export const resolveLinks = (content: string, cache: Record<string, string>) =>
  content.replace(/\[([^\]]+)\]\(attachment:([^)\s]+)\)/g, (m, label: string, p: string) => (cache[p] ? `[${label}](${cache[p]})` : label));

export function toNoteDraft(values: NoteFormValues): Required<NoteDraft> {
  return {
    title: values.title,
    content: values.content || null,
    favorite: values.favorite ?? false,
    tags: parseTags(values.tags),
    courseId: values.courseId || null,
    category: normalizeCategory(values.category),
  };
}

/** Pending uploads referenced in saved content stay; the rest are orphaned. */
export function splitKeptDropped(content: string, pending: PendingPdf[]): { kept: PendingPdf[]; dropped: string[] } {
  const kept = pending.filter((p) => hasLink(content, p.path));
  const dropped = pending.filter((p) => !hasLink(content, p.path)).map((p) => p.path);
  return { kept, dropped };
}

/** Previously saved PDFs whose link was removed from the content. */
export function findUnlinkedAttachments(content: string, dialog: DialogPdf[]): string[] {
  return dialog.filter((a) => !a.path.startsWith("http") && !hasLink(content, a.path)).map((a) => a.path);
}

export function stripAttachmentLink(content: string, path: string): string {
  return content.replace(new RegExp(`\\n*\\[[^\\]]*\\]\\(attachment:${escapeRegExp(path)}\\)`, "g"), "");
}

export function linkedAttachments(
  content: string,
  dialog: DialogPdf[],
  pending: PendingPdf[],
  urlCache: Record<string, string>
): DialogPdf[] {
  return [
    ...dialog.filter((a) => a.path.startsWith("http") || hasLink(content, a.path)),
    ...pending.filter((p) => hasLink(content, p.path)).map((p) => ({ name: p.file_name, url: urlCache[p.path] ?? "", path: p.path })),
  ];
}

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** Why a file can't be attached, or null when it can. */
export function validatePdf(file: { type: string; size: number }): string | null {
  if (file.type !== "application/pdf") return "Only PDF allowed";
  return file.size > MAX_PDF_BYTES ? "PDF exceeds 10MB limit" : null;
}

/** Storage keys and the `attachment:` link regex both break on spaces/parens, so keep the key to safe chars. */
export function pdfStoragePath(userId: string, fileName: string, now: number): string {
  return `${userId}/${now}-${fileName.replace(/[^\w.-]+/g, "_")}`;
}

export function appendAttachmentLink(content: string, fileName: string, path: string): string {
  return `${content}\n\n[PDF: ${fileName}](attachment:${path})`;
}

/** Wraps the selected range (or the whole text when there's no textarea) in `before`/`after`; an empty selection becomes "text". */
export function wrapSelection(
  content: string,
  selection: { selectionStart: number; selectionEnd: number } | null,
  before: string,
  after: string
): string {
  const { selectionStart: s, selectionEnd: e } = selection ?? { selectionStart: 0, selectionEnd: content.length };
  return content.slice(0, s) + before + (content.slice(s, e) || "text") + after + content.slice(e);
}

/** Form values for editing `note`, or a blank form in `defaultCategory` for a new one. */
export function noteToFormValues(note: Note | null, defaultCategory: string | null): NoteFormValues {
  if (!note) return { title: "", content: "", favorite: false, tags: "", courseId: "", category: defaultCategory ?? "" };
  return {
    title: note.title,
    content: note.content ?? "",
    favorite: note.favorite,
    tags: note.tags.join(", "),
    courseId: note.courseId ?? "",
    category: note.category ?? "",
  };
}

export interface NoteFilters {
  query: string;
  favorite: boolean;
  /** "all", "none" (no course) or a course id. */
  course: string;
  /** "all" or a tag. */
  tag: string;
  /** "all", `UNCATEGORIZED_FILTER` or a category name. */
  category: string;
}

export const EMPTY_NOTE_FILTERS: NoteFilters = { query: "", favorite: false, course: "all", tag: "all", category: "all" };

export function hasActiveFilters(f: NoteFilters): boolean {
  return f.query !== "" || f.favorite || f.course !== "all" || f.tag !== "all" || f.category !== "all";
}

/** Lower-cased searchable text per note id, built once per notes change rather than per keystroke. */
export function buildNoteSearchIndex(notes: Note[]): Map<string, string> {
  return new Map(notes.map((n) => [n.id, [n.title, n.content, n.tags.join(" "), n.courseName, n.category].filter(Boolean).join(" ").toLowerCase()]));
}

export function filterStudyNotes(notes: Note[], index: Map<string, string>, f: NoteFilters): Note[] {
  const q = f.query.trim().toLowerCase();
  return notes.filter(
    (n) =>
      (!q || (index.get(n.id) ?? "").includes(q)) &&
      (!f.favorite || n.favorite) &&
      matchesCourseFilter(n.courseId, f.course) &&
      (f.tag === "all" || n.tags.includes(f.tag)) &&
      matchesCategoryFilter(n.category, f.category)
  );
}
