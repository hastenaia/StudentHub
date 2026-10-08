// Pure helpers for the Study Hub "Import file" flow (components/study/ImportTab.tsx).
// Binary parsing lives in app/api/ai/from-document/route.ts; everything here is
// dependency-free so it stays unit-testable.

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Same slice the summarize/flashcards routes send the model, so cache keys and prompts agree. */
export const DOCUMENT_SOURCE_CHARS = 6000;

export const MIN_SUMMARY_CHARS = 20;
export const MIN_FLASHCARDS_CHARS = 30;

export type DocumentKind = "pdf" | "txt" | "md" | "docx";

const EXT_TO_KIND: Record<string, DocumentKind> = {
  pdf: "pdf",
  txt: "txt",
  md: "md",
  markdown: "md",
  docx: "docx",
};

const MIME_TO_KIND: Record<string, DocumentKind> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const ACCEPT_HINT = "Supported files: PDF, TXT, Markdown, DOCX.";

/** Kind from the file extension first, falling back to the MIME type. Null when unsupported. */
export function detectDocumentKind(fileName: string, mimeType: string): DocumentKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext && EXT_TO_KIND[ext]) return EXT_TO_KIND[ext];
  if (mimeType && MIME_TO_KIND[mimeType.toLowerCase()]) return MIME_TO_KIND[mimeType.toLowerCase()];
  return null;
}

/** Why a file can't be imported, or null when it can. Matches the 10MB notes-PDF cap. */
export function validateDocumentFile(file: { name: string; type: string; size: number }): string | null {
  if (!detectDocumentKind(file.name, file.type)) return `Unsupported file type. ${ACCEPT_HINT}`;
  if (file.size <= 0) return "That file looks empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "File exceeds 10MB limit.";
  return null;
}

export function clampFlashcardCount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return 5;
  return Math.min(Math.max(Math.floor(n), 1), 10);
}

/** Trim + truncate to the slice sent to the model. Empty when there is no usable text. */
export function prepareSource(text: string): string {
  return text.trim().slice(0, DOCUMENT_SOURCE_CHARS);
}

/** Default note title from the uploaded file name (extension stripped, capped at 80 chars). */
export function defaultTitleFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " ").trim();
  if (!base) return "Imported document";
  return base.length > 80 ? `${base.slice(0, 79)}…` : base;
}
