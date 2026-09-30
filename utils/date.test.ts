import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDueLabel, formatRelativeDateTime, formatRelativeSync, formatTime, isOverdue } from "./date";
import { trimOrNull } from "./text";

// Local-time noon on Sep 15 2026, so day-boundary tests don't depend on the machine's timezone.
const NOW = new Date(2026, 8, 15, 12, 0, 0);
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();
const localDay = (offsetDays: number, hour = 9) => new Date(2026, 8, 15 + offsetDays, hour).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("date formatters", () => {
  it("show placeholders for missing values", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDueLabel(null)).toBe("No due date");
    expect(formatRelativeSync(null)).toBe("Never synced");
    expect(formatRelativeDateTime(null)).toBe("");
    expect(isOverdue(null)).toBe(false);
  });

  it("formatDate uses short month + day", () => {
    expect(formatDate(localDay(0))).toBe("Sep 15");
  });

  it("formatDueLabel names today / tomorrow / yesterday by local day", () => {
    // Late-in-the-day times used to round up a day (e.g. tonight 23:00 → "Due tomorrow").
    for (const hour of [0, 9, 13, 23]) {
      expect(formatDueLabel(localDay(0, hour))).toBe("Due today");
      expect(formatDueLabel(localDay(1, hour))).toBe("Due tomorrow");
      expect(formatDueLabel(localDay(-1, hour))).toBe("Due yesterday");
    }
    expect(formatDueLabel(localDay(2, 23))).toBe("Due Sep 17");
    expect(formatDueLabel(localDay(5))).toBe("Due Sep 20");
  });

  it("formatRelativeSync buckets by elapsed time", () => {
    expect(formatRelativeSync(ago(30))).toBe("Synced just now");
    expect(formatRelativeSync(ago(5 * 60))).toBe("Synced 5m ago");
    expect(formatRelativeSync(ago(3 * 3600))).toBe("Synced 3h ago");
    expect(formatRelativeSync(ago(2 * 86400))).toBe("Synced 2d ago");
  });

  it("formatRelativeDateTime switches to a date after a week", () => {
    expect(formatRelativeDateTime(ago(10))).toBe("just now");
    expect(formatRelativeDateTime(ago(6 * 86400))).toBe("6d ago");
    expect(formatRelativeDateTime(localDay(-8))).toBe("Sep 7");
  });

  it("isOverdue compares against now", () => {
    expect(isOverdue(ago(1))).toBe(true);
    expect(isOverdue(ago(-60))).toBe(false);
  });
});

describe("trimOrNull", () => {
  it("trims, and maps empty/missing to null", () => {
    expect(trimOrNull("  x  ")).toBe("x");
    expect(trimOrNull("   ")).toBeNull();
    expect(trimOrNull("")).toBeNull();
    expect(trimOrNull(null)).toBeNull();
    expect(trimOrNull(undefined)).toBeNull();
  });
});
