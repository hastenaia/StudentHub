import { describe, expect, it } from "vitest";
import {
  categoryFromFilter,
  filterNotes,
  matchesCategoryFilter,
  MAX_CATEGORY_LENGTH,
  normalizeCategory,
  renameCategoryInNotes,
  summarizeCategories,
  UNCATEGORIZED_FILTER,
} from "./noteCategories";

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

describe("string category filters", () => {
  it("categoryFromFilter only returns a specific category", () => {
    expect(categoryFromFilter("all")).toBeNull();
    expect(categoryFromFilter(UNCATEGORIZED_FILTER)).toBeNull();
    expect(categoryFromFilter("Week 1")).toBe("Week 1");
  });

  it("matchesCategoryFilter handles all, uncategorized and named filters", () => {
    expect(matchesCategoryFilter(null, "all")).toBe(true);
    expect(matchesCategoryFilter("A", "all")).toBe(true);
    expect(matchesCategoryFilter(null, UNCATEGORIZED_FILTER)).toBe(true);
    expect(matchesCategoryFilter("A", UNCATEGORIZED_FILTER)).toBe(false);
    expect(matchesCategoryFilter("A", "A")).toBe(true);
    expect(matchesCategoryFilter("B", "A")).toBe(false);
  });
});

describe("renameCategoryInNotes", () => {
  it("moves only notes in the renamed category", () => {
    const keep = note("b", "Other");
    const out = renameCategoryInNotes([note("a", "Old"), keep, note("c", null)], "Old", "New");
    expect(out.map((n) => n.category)).toEqual(["New", "Other", null]);
    expect(out[1]).toBe(keep);
  });

  it("clears the category when renamed to null", () => {
    expect(renameCategoryInNotes([note("a", "Old")], "Old", null)[0].category).toBeNull();
  });
});
