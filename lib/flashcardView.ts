import type { Database } from "@/types/database.types";
import type { CourseOption, Flashcard, FlashcardDraft } from "@/types/study";
import type { FlashcardFormValues } from "@/lib/validations/study";
import { matchesCourseFilter } from "@/lib/courseView";
import { parseTags } from "@/utils/text";

type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

/** Map a raw flashcards row (DB snake_case) to the UI view model; course names resolve only with a `courseMap`. */
export function flashcardRowToView(row: FlashcardRow, courseMap: Map<string, Pick<CourseOption, "name">> = new Map()): Flashcard {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: courseMap.get(row.course_id ?? "")?.name ?? null,
    noteId: row.note_id,
    front: row.front,
    back: row.back,
    tags: row.tags ?? [],
    isKnown: row.is_known ?? false,
    correctCount: row.correct_count ?? 0,
    incorrectCount: row.incorrect_count ?? 0,
    lastReviewed: row.last_reviewed,
    createdAt: row.created_at,
  };
}

export function flashcardToFormValues(card: Flashcard | null): FlashcardFormValues {
  if (!card) return { front: "", back: "", tags: "", courseId: "", noteId: "" };
  return { front: card.front, back: card.back, tags: card.tags.join(", "), courseId: card.courseId ?? "", noteId: card.noteId ?? "" };
}

export function flashcardFormToDraft(values: FlashcardFormValues): FlashcardDraft {
  return {
    front: values.front,
    back: values.back,
    tags: parseTags(values.tags),
    courseId: values.courseId || null,
    noteId: values.noteId || null,
  };
}

export interface FlashcardFilters {
  query: string;
  /** "all", "none" (no course) or a course id. */
  course: string;
  known: "all" | "known" | "unknown";
}

export const EMPTY_FLASHCARD_FILTERS: FlashcardFilters = { query: "", course: "all", known: "all" };

export function buildFlashcardSearchIndex(cards: Flashcard[]): Map<string, string> {
  return new Map(cards.map((c) => [c.id, `${c.front} ${c.back} ${c.tags.join(" ")}`.toLowerCase()]));
}

const KNOWN_FILTER: Record<FlashcardFilters["known"], (c: Flashcard) => boolean> = {
  all: () => true,
  known: (c) => c.isKnown,
  unknown: (c) => !c.isKnown,
};

export function filterFlashcards(cards: Flashcard[], index: Map<string, string>, f: FlashcardFilters): Flashcard[] {
  const q = f.query.trim().toLowerCase();
  return cards.filter((c) => (!q || (index.get(c.id) ?? "").includes(q)) && matchesCourseFilter(c.courseId, f.course) && KNOWN_FILTER[f.known](c));
}

/** Cards to study: the unknown ones, or all of them once everything is known. */
export function studyDeck(cards: Flashcard[]): Flashcard[] {
  const unknown = cards.filter((c) => !c.isKnown);
  return unknown.length > 0 ? unknown : cards;
}

/** Share of known cards, 0–100. */
export function knownPercent(cards: Flashcard[]): number {
  if (cards.length === 0) return 0;
  return Math.round((cards.filter((c) => c.isKnown).length / cards.length) * 100);
}

/** Next card position, wrapping to the start. */
export function nextDeckIndex(index: number, length: number): number {
  return index + 1 < length ? index + 1 : 0;
}

/** Column values shared by flashcard insert and update. */
export function flashcardDraftToColumns(draft: FlashcardDraft) {
  return {
    front: draft.front.trim(),
    back: draft.back.trim(),
    tags: draft.tags,
    course_id: draft.courseId || null,
    note_id: draft.noteId || null,
  };
}

/** Update for a study answer: sets the known flag and bumps the matching counter. */
export function flashcardReviewPatch(current: { correct_count: number | null; incorrect_count: number | null }, known: boolean, now: Date) {
  const counter = known ? { correct_count: (current.correct_count ?? 0) + 1 } : { incorrect_count: (current.incorrect_count ?? 0) + 1 };
  return { is_known: known, last_reviewed: now.toISOString(), ...counter };
}
