import { describe, expect, it } from "vitest";
import { hasUnread, toNotificationItems } from "./notifications";

describe("toNotificationItems", () => {
  it("returns empty for no input", () => {
    expect(toNotificationItems([], [], [])).toEqual([]);
  });

  it("puts overdue first and caps at 8", () => {
    const announcements = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      text: `Announcement ${i}`,
      courseName: "Math",
      publishTime: "2026-09-20T10:00:00Z",
    }));
    const deadlines = Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      title: `Deadline ${i}`,
      courseName: "Bio",
      dueAt: "2026-09-25T10:00:00Z",
      kind: "assignment" as const,
    }));
    const overdue = [{ id: "t1", title: "Late task", courseName: "Chem", dueAt: "2026-09-01T10:00:00Z" }];
    const items = toNotificationItems(announcements, deadlines, overdue);
    expect(items).toHaveLength(8);
    expect(items[0].kind).toBe("overdue");
  });

  it("truncates long announcement text", () => {
    const items = toNotificationItems([{ id: "a1", text: "x".repeat(100), courseName: null, publishTime: null }], [], []);
    expect(items[0].title.endsWith("…")).toBe(true);
  });
});

describe("hasUnread", () => {
  it("hides the dot when empty or missing", () => {
    expect(hasUnread([])).toBe(false);
    expect(hasUnread(null)).toBe(false);
    expect(hasUnread(undefined)).toBe(false);
  });

  it("shows the dot when items exist", () => {
    expect(
      hasUnread([{ id: "1", kind: "deadline", title: "T", subtitle: null, href: "/dashboard/tasks", at: null }])
    ).toBe(true);
  });
});
