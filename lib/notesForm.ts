import type { NoteFormValues } from "@/lib/validations/study";
import type { NoteDraft } from "@/types/study";

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

// No `category`: the Study Hub form doesn't edit it, and omitting it leaves the stored value alone on update.
export function toNoteDraft(values: NoteFormValues): Omit<Required<NoteDraft>, "category"> {
  return {
    title: values.title,
    content: values.content || null,
    favorite: values.favorite ?? false,
    tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) : [],
    courseId: values.courseId || null,
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
