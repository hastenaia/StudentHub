import { describe, expect, it } from "vitest";
import { filterNotes, MAX_CATEGORY_LENGTH, normalizeCategory, summarizeCategories } from "./noteCategories";

const note = (title: string, category: string | null, extra: Partial<{ tags: string[]; content: string; courseName: string }> = {}) => ({
  title,
  category,
  tags: extra.tags ?? [],
  content: extra.content ?? null,
  courseName: extra.courseName ?? null,
});

describe("normalizeCategory", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCategory("  Exam   prep ")).toBe("Exam prep");
  });

  it.each([null, undefined, "", "   "])("maps %j to null", (v) => {
    expect(normalizeCategory(v)).toBeNull();
  });

  it("caps length to the DB constraint", () => {
    expect(normalizeCategory("x".repeat(100))).toHaveLength(MAX_CATEGORY_LENGTH);
  });
});

describe("summarizeCategories", () => {
  it("counts per category, sorts case-insensitively, and counts uncategorized", () => {
    const out = summarizeCategories([note("a", "labs"), note("b", "Exams"), note("c", "labs"), note("d", null)]);
    expect(out.categories).toEqual([{ name: "Exams", count: 1 }, { name: "labs", count: 2 }]);
    expect(out.uncategorized).toBe(1);
  });
});

describe("filterNotes", () => {
  const notes = [note("Integrals", "Math", { tags: ["exam"] }), note("Titration", "Lab", { content: "phenolphthalein" }), note("Loose", null)];

  it("filters by category, uncategorized, or all", () => {
    expect(filterNotes(notes, "Math", "").map((n) => n.title)).toEqual(["Integrals"]);
    expect(filterNotes(notes, null, "").map((n) => n.title)).toEqual(["Loose"]);
    expect(filterNotes(notes, "all", "")).toHaveLength(3);
  });

  it("searches title, tags, category and content case-insensitively", () => {
    expect(filterNotes(notes, "all", "EXAM").map((n) => n.title)).toEqual(["Integrals"]);
    expect(filterNotes(notes, "all", "phenol").map((n) => n.title)).toEqual(["Titration"]);
    expect(filterNotes(notes, "all", "lab").map((n) => n.title)).toEqual(["Titration"]);
  });
});
