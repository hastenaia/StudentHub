/** Trimmed text, or null when empty/missing — for optional DB text columns. */
export function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}
