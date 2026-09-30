import type { Note } from "@/types/study";

/** Matches the `notes.category` check constraint. */
export const MAX_CATEGORY_LENGTH = 40;

/** Trims, collapses inner whitespace and caps length; blank → null (uncategorized). */
export function normalizeCategory(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_LENGTH).trim();
  return s || null;
}

export interface CategorySummary {
  name: string;
  count: number;
}

/** Categories in use, alphabetical (case-insensitive), plus how many notes have none. */
export function summarizeCategories(notes: Pick<Note, "category">[]): { categories: CategorySummary[]; uncategorized: number } {
  const counts = new Map<string, number>();
  let uncategorized = 0;
  for (const n of notes) {
    if (n.category) counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
    else uncategorized++;
  }
  const categories = [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { categories, uncategorized };
}

/** "all" = every note, null = uncategorized only, string = that category. */
export type CategoryFilter = "all" | null | string;

export function filterNotes<T extends Pick<Note, "title" | "category" | "tags" | "courseName" | "content">>(
  notes: T[],
  category: CategoryFilter,
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  return notes.filter((n) => {
    if (category !== "all" && n.category !== category) return false;
    if (!q) return true;
    return [n.title, n.category ?? "", n.courseName ?? "", n.tags.join(" "), n.content ?? ""].join(" ").toLowerCase().includes(q);
  });
}

/** `<select>` value for "notes without a category" in string-only category filters. */
export const UNCATEGORIZED_FILTER = "__none__";

/** The specific category a string filter selects, or null for "all" / uncategorized. */
export function categoryFromFilter(filter: string): string | null {
  return filter === "all" || filter === UNCATEGORIZED_FILTER ? null : filter;
}

export function matchesCategoryFilter(category: string | null, filter: string): boolean {
  if (filter === "all") return true;
  return filter === UNCATEGORIZED_FILTER ? !category : category === filter;
}

/** Moves every note in `from` to `to` (null = uncategorized); other notes keep their identity. */
export function renameCategoryInNotes<T extends Pick<Note, "category">>(notes: T[], from: string, to: string | null): T[] {
  return notes.map((n) => (n.category === from ? { ...n, category: to } : n));
}
