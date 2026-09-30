/** Trimmed text, or null when empty/missing — for optional DB text columns. */
export function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** Comma-separated tags → trimmed, non-empty, at most 10. */
export function parseTags(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/** Replaces the item with the same id, or prepends a new one. */
export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [item, ...items];
}
