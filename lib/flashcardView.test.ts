import { describe, expect, it } from "vitest";
import {
  buildFlashcardSearchIndex,
  EMPTY_FLASHCARD_FILTERS,
  filterFlashcards,
  flashcardDraftToColumns,
  flashcardReviewPatch,
  flashcardFormToDraft,
  flashcardRowToView,
  flashcardToFormValues,
  knownPercent,
  nextDeckIndex,
  studyDeck,
  type FlashcardFilters,
} from "./flashcardView";
import type { Database } from "@/types/database.types";
import type { Flashcard } from "@/types/study";

type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

const card = (id: string, over: Partial<Flashcard> = {}): Flashcard => ({
  id,
  courseId: null,
  courseName: null,
  noteId: null,
  front: `front ${id}`,
  back: `back ${id}`,
  tags: [],
  isKnown: false,
  correctCount: 0,
  incorrectCount: 0,
  lastReviewed: null,
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

describe("flashcardRowToView", () => {
  const row = {
    id: "f1",
    user_id: "u1",
    course_id: "c1",
    note_id: null,
    front: "F",
    back: "B",
    tags: null,
    is_known: null,
    correct_count: null,
    incorrect_count: 2,
    last_reviewed: null,
    created_at: "2026-09-01T00:00:00Z",
  } as unknown as FlashcardRow;

  it("maps snake_case columns with defaults", () => {
    expect(flashcardRowToView(row)).toEqual({
      id: "f1",
      courseId: "c1",
      courseName: null,
      noteId: null,
      front: "F",
      back: "B",
      tags: [],
      isKnown: false,
      correctCount: 0,
      incorrectCount: 2,
      lastReviewed: null,
      createdAt: "2026-09-01T00:00:00Z",
    });
  });

  it("resolves the course name from the map", () => {
    expect(flashcardRowToView(row, new Map([["c1", { name: "Biology" }]])).courseName).toBe("Biology");
  });
});

describe("flashcard form mapping", () => {
  it("round-trips a card through the form", () => {
    const c = card("1", { tags: ["a", "b"], courseId: "c1", noteId: "n1" });
    const values = flashcardToFormValues(c);
    expect(values).toEqual({ front: "front 1", back: "back 1", tags: "a, b", courseId: "c1", noteId: "n1" });
    expect(flashcardFormToDraft(values)).toEqual({ front: "front 1", back: "back 1", tags: ["a", "b"], courseId: "c1", noteId: "n1" });
  });

  it("starts blank and nulls empty ids", () => {
    expect(flashcardToFormValues(null)).toEqual({ front: "", back: "", tags: "", courseId: "", noteId: "" });
    expect(flashcardFormToDraft(flashcardToFormValues(card("2")))).toMatchObject({ tags: [], courseId: null, noteId: null });
  });
});

describe("flashcard write payloads", () => {
  it("trims text and nulls empty ids", () => {
    expect(flashcardDraftToColumns({ front: " Q ", back: " A ", tags: ["t"], courseId: "", noteId: "n1" })).toEqual({
      front: "Q",
      back: "A",
      tags: ["t"],
      course_id: null,
      note_id: "n1",
    });
  });

  it("bumps the counter matching the answer", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(flashcardReviewPatch({ correct_count: 2, incorrect_count: 1 }, true, now)).toEqual({
      is_known: true,
      last_reviewed: "2026-09-30T12:00:00.000Z",
      correct_count: 3,
    });
    expect(flashcardReviewPatch({ correct_count: null, incorrect_count: null }, false, now)).toEqual({
      is_known: false,
      last_reviewed: "2026-09-30T12:00:00.000Z",
      incorrect_count: 1,
    });
  });
});

describe("flashcard filters and study", () => {
  const cards = [card("a", { tags: ["vocab"], courseId: "c1", isKnown: true }), card("b", { back: "Mitosis" }), card("c", { courseId: "c2" })];
  const index = buildFlashcardSearchIndex(cards);
  const ids = (f: Partial<FlashcardFilters>) => filterFlashcards(cards, index, { ...EMPTY_FLASHCARD_FILTERS, ...f }).map((c) => c.id);

  it("filters by text, course and known state", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(ids({ query: " VOCAB" })).toEqual(["a"]);
    expect(ids({ query: "mitosis" })).toEqual(["b"]);
    expect(ids({ course: "none" })).toEqual(["b"]);
    expect(ids({ course: "c2" })).toEqual(["c"]);
    expect(ids({ known: "known" })).toEqual(["a"]);
    expect(ids({ known: "unknown" })).toEqual(["b", "c"]);
  });

  it("studies unknown cards first, then everything once all are known", () => {
    expect(studyDeck(cards).map((c) => c.id)).toEqual(["b", "c"]);
    expect(studyDeck(cards.map((c) => ({ ...c, isKnown: true })))).toHaveLength(3);
  });

  it("knownPercent rounds and handles an empty collection", () => {
    expect(knownPercent(cards)).toBe(33);
    expect(knownPercent([])).toBe(0);
  });

  it("nextDeckIndex wraps to the start", () => {
    expect(nextDeckIndex(0, 3)).toBe(1);
    expect(nextDeckIndex(2, 3)).toBe(0);
    expect(nextDeckIndex(0, 0)).toBe(0);
  });
});
