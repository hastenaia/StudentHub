import { describe, expect, it } from "vitest";
import {
  appendAttachmentLink,
  buildNoteSearchIndex,
  EMPTY_NOTE_FILTERS,
  filterStudyNotes,
  findUnlinkedAttachments,
  hasActiveFilters,
  linkedAttachments,
  MAX_PDF_BYTES,
  noteToFormValues,
  pdfStoragePath,
  resolveLinks,
  splitKeptDropped,
  stripAttachmentLink,
  toNoteDraft,
  toUrlMap,
  validatePdf,
  wrapSelection,
} from "./notesForm";
import { UNCATEGORIZED_FILTER } from "./noteCategories";
import type { Note } from "@/types/study";

const mkNote = (id: string, over: Partial<Note> = {}): Note => ({
  id,
  title: `Note ${id}`,
  content: null,
  favorite: false,
  tags: [],
  category: null,
  courseId: null,
  courseName: null,
  courseColor: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  ...over,
});

describe("notesForm", () => {
  it("toNoteDraft parses tags and normalizes empties", () => {
    expect(toNoteDraft({ title: "t", content: "", favorite: undefined, tags: "a, b,,c", courseId: "", category: "  Week   1 " })).toEqual({
      title: "t",
      content: null,
      favorite: false,
      tags: ["a", "b", "c"],
      courseId: null,
      category: "Week 1",
    });
  });

  it("splitKeptDropped keeps linked pending uploads", () => {
    const pending = [{ path: "u/1-a.pdf", file_name: "a.pdf" }, { path: "u/1-b.pdf", file_name: "b.pdf" }];
    expect(splitKeptDropped("see [PDF: a](attachment:u/1-a.pdf)", pending)).toEqual({
      kept: [pending[0]],
      dropped: ["u/1-b.pdf"],
    });
  });

  it("findUnlinkedAttachments ignores http entries", () => {
    const dialog = [{ name: "x", url: "https://cdn/x.pdf", path: "https://cdn/x.pdf" }, { name: "y", url: "", path: "u/1-y.pdf" }];
    expect(findUnlinkedAttachments("no links", dialog)).toEqual(["u/1-y.pdf"]);
  });

  it("stripAttachmentLink removes the markdown link", () => {
    expect(stripAttachmentLink("a\n[PDF: x](attachment:u/1-x.pdf)\nb", "u/1-x.pdf")).toBe("a\nb");
  });

  it("resolveLinks swaps cache hits and drops misses to label", () => {
    expect(resolveLinks("[a](attachment:p1) [b](attachment:p2)", { p1: "https://s/p1" })).toBe("[a](https://s/p1) b");
  });

  it("toUrlMap skips http paths and linkedAttachments merges", () => {
    expect(toUrlMap([{ url: "s", path: "p" }, { url: "h", path: "https://h" }])).toEqual({ p: "s" });
    const linked = linkedAttachments("[x](attachment:p)", [{ name: "d", url: "u", path: "https://d" }], [{ path: "p", file_name: "x.pdf" }], { p: "s" });
    expect(linked).toEqual([{ name: "d", url: "u", path: "https://d" }, { name: "x.pdf", url: "s", path: "p" }]);
  });
});

describe("PDF helpers", () => {
  it("validatePdf rejects non-PDFs and oversize files", () => {
    expect(validatePdf({ type: "image/png", size: 1 })).toBe("Only PDF allowed");
    expect(validatePdf({ type: "application/pdf", size: MAX_PDF_BYTES + 1 })).toBe("PDF exceeds 10MB limit");
    expect(validatePdf({ type: "application/pdf", size: MAX_PDF_BYTES })).toBeNull();
  });

  it("pdfStoragePath keeps keys to safe characters", () => {
    expect(pdfStoragePath("u1", "My notes (v2).pdf", 42)).toBe("u1/42-My_notes_v2_.pdf");
  });

  it("appendAttachmentLink adds a resolvable attachment link", () => {
    const out = appendAttachmentLink("body", "a.pdf", "u/1-a.pdf");
    expect(out).toBe("body\n\n[PDF: a.pdf](attachment:u/1-a.pdf)");
    expect(resolveLinks(out, { "u/1-a.pdf": "https://x" })).toContain("[PDF: a.pdf](https://x)");
  });
});

describe("wrapSelection", () => {
  it("wraps the selected range", () => {
    expect(wrapSelection("say hi now", { selectionStart: 4, selectionEnd: 6 }, "**", "**")).toBe("say **hi** now");
  });

  it("inserts placeholder text for an empty selection", () => {
    expect(wrapSelection("ab", { selectionStart: 1, selectionEnd: 1 }, "*", "*")).toBe("a*text*b");
  });

  it("wraps everything without a textarea", () => {
    expect(wrapSelection("all", null, "**", "**")).toBe("**all**");
    expect(wrapSelection("", null, "**", "**")).toBe("**text**");
  });
});

describe("noteToFormValues", () => {
  it("starts a new note in the default category", () => {
    expect(noteToFormValues(null, "Week 1")).toEqual({ title: "", content: "", favorite: false, tags: "", courseId: "", category: "Week 1" });
    expect(noteToFormValues(null, null).category).toBe("");
  });

  it("maps an existing note, blanking nulls", () => {
    const n = mkNote("1", { title: "T", content: "C", favorite: true, tags: ["a", "b"], courseId: "c1", category: "K" });
    expect(noteToFormValues(n, "ignored")).toEqual({ title: "T", content: "C", favorite: true, tags: "a, b", courseId: "c1", category: "K" });
    expect(noteToFormValues(mkNote("2"), null)).toMatchObject({ content: "", courseId: "", category: "" });
  });
});

describe("note filters", () => {
  const notes = [
    mkNote("1", { title: "Cells", tags: ["bio"], courseId: "c1", courseName: "Biology", favorite: true, category: "Exams" }),
    mkNote("2", { title: "Loops", content: "for and while", tags: ["cs"] }),
    mkNote("3", { title: "Mitosis", tags: ["bio"], courseId: "c2", category: "Labs" }),
  ];
  const index = buildNoteSearchIndex(notes);
  const ids = (f: Partial<typeof EMPTY_NOTE_FILTERS>) => filterStudyNotes(notes, index, { ...EMPTY_NOTE_FILTERS, ...f }).map((n) => n.id);

  it("returns everything with no filters", () => {
    expect(ids({})).toEqual(["1", "2", "3"]);
    expect(hasActiveFilters(EMPTY_NOTE_FILTERS)).toBe(false);
  });

  it("searches title, content, course and category case-insensitively", () => {
    expect(ids({ query: "  WHILE " })).toEqual(["2"]);
    expect(ids({ query: "biology" })).toEqual(["1"]);
    expect(ids({ query: "labs" })).toEqual(["3"]);
  });

  it("filters by favorite, course, tag and category", () => {
    expect(ids({ favorite: true })).toEqual(["1"]);
    expect(ids({ course: "none" })).toEqual(["2"]);
    expect(ids({ course: "c2" })).toEqual(["3"]);
    expect(ids({ tag: "bio" })).toEqual(["1", "3"]);
    expect(ids({ category: UNCATEGORIZED_FILTER })).toEqual(["2"]);
    expect(ids({ tag: "bio", category: "Exams" })).toEqual(["1"]);
  });

  it.each([{ query: "x" }, { favorite: true }, { course: "c1" }, { tag: "bio" }, { category: "Exams" }])("hasActiveFilters(%o)", (f) => {
    expect(hasActiveFilters({ ...EMPTY_NOTE_FILTERS, ...f })).toBe(true);
  });
});
