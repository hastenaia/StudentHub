import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  formatRecurrenceLabel,
  nextRecurrence,
  type ScheduleInput,
} from "@/lib/scheduling";

const NOW = new Date("2026-08-15T12:00:00Z");

function task(over: Partial<ScheduleInput> & Pick<ScheduleInput, "id" | "title">): ScheduleInput {
  return { priority: "medium", dueAt: null, estimateMinutes: null, ...over };
}

function ids(ordered: { taskId: string }[]): string[] {
  return ordered.map((item) => item.taskId);
}

describe("buildSchedule (min-heap ordering)", () => {
  it("pops overdue tasks first, most-overdue first", () => {
    const ordered = buildSchedule(
      [
        task({ id: "a", title: "A", dueAt: "2026-08-15T10:00:00Z" }), // 2h late
        task({ id: "b", title: "B", dueAt: "2026-08-15T07:00:00Z" }), // 5h late
      ],
      NOW
    );
    expect(ids(ordered)).toEqual(["b", "a"]);
  });

  it("orders due-soon before due-later before no-due", () => {
    const ordered = buildSchedule(
      [
        task({ id: "later", title: "Later", dueAt: "2026-08-20T12:00:00Z" }),
        task({ id: "none", title: "No due" }),
        task({ id: "today", title: "Today", dueAt: "2026-08-15T14:00:00Z" }),
      ],
      NOW
    );
    expect(ids(ordered)).toEqual(["today", "later", "none"]);
  });

  it("breaks ties on priority, then effort", () => {
    const ordered = buildSchedule(
      [
        task({ id: "low", title: "Low", priority: "low", dueAt: "2026-08-20T12:00:00Z" }),
        task({ id: "urgent", title: "Urgent", priority: "urgent", dueAt: "2026-08-20T12:00:00Z" }),
      ],
      NOW
    );
    expect(ids(ordered)).toEqual(["urgent", "low"]);

    const byEffort = buildSchedule(
      [
        task({ id: "slow", title: "Slow", dueAt: "2026-08-20T12:00:00Z", estimateMinutes: 90 }),
        task({ id: "fast", title: "Fast", dueAt: "2026-08-20T12:00:00Z", estimateMinutes: 15 }),
      ],
      NOW
    );
    expect(ids(byEffort)).toEqual(["fast", "slow"]);
  });

  it("puts no-due tasks after every dated task regardless of priority", () => {
    const ordered = buildSchedule(
      [
        task({ id: "urgent-nodue", title: "Urgent", priority: "urgent" }),
        task({ id: "low-due", title: "Low due", priority: "low", dueAt: "2026-09-01T12:00:00Z" }),
      ],
      NOW
    );
    expect(ids(ordered)).toEqual(["low-due", "urgent-nodue"]);
  });

  it("produces a per-task reason", () => {
    const [item] = buildSchedule(
      [task({ id: "a", title: "A", priority: "urgent", dueAt: "2026-08-15T10:00:00Z" })],
      NOW
    );
    expect(item.reason).toContain("Urgent");
    expect(item.reason).toContain("overdue");
  });

  it("ignores input order", () => {
    const a = task({ id: "a", title: "A", dueAt: "2026-08-16T00:00:00Z" });
    const b = task({ id: "b", title: "B", dueAt: "2026-08-15T13:00:00Z" });
    const forward = ids(buildSchedule([a, b], NOW));
    const backward = ids(buildSchedule([b, a], NOW));
    expect(forward).toEqual(backward);
  });
});

describe("nextRecurrence", () => {
  it("advances daily tasks by the interval", () => {
    const now = new Date("2026-08-15T08:00:00Z");
    expect(nextRecurrence("2026-08-15T09:00:00Z", "daily", 1, null, now)).toBe(
      "2026-08-16T09:00:00.000Z"
    );
    expect(nextRecurrence("2026-08-15T09:00:00Z", "daily", 3, null, now)).toBe(
      "2026-08-18T09:00:00.000Z"
    );
  });

  it("advances weekly tasks by the interval", () => {
    const now = new Date("2026-08-15T08:00:00Z");
    expect(nextRecurrence("2026-08-15T09:00:00Z", "weekly", 2, null, now)).toBe(
      "2026-08-29T09:00:00.000Z"
    );
  });

  it("advances monthly tasks, clamping to the target month's last day", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(nextRecurrence("2026-01-31T10:00:00Z", "monthly", 1, null, now)).toBe(
      "2026-02-28T10:00:00.000Z"
    );
    expect(nextRecurrence("2026-01-15T10:00:00Z", "monthly", 1, null, now)).toBe(
      "2026-02-15T10:00:00.000Z"
    );
  });

  it("re-bases overdue recurrences from now instead of the past", () => {
    expect(nextRecurrence("2026-08-01T09:00:00Z", "daily", 1, null, NOW)).toBe(
      "2026-08-16T12:00:00.000Z"
    );
  });

  it("returns null once the next instance passes recurUntil", () => {
    const now = new Date("2026-08-15T08:00:00Z");
    expect(nextRecurrence("2026-08-15T09:00:00Z", "daily", 1, "2026-08-16T00:00:00Z", now)).toBe(
      null
    );
    expect(nextRecurrence("2026-08-15T09:00:00Z", "daily", 1, "2026-08-16T23:00:00Z", now)).toBe(
      "2026-08-16T09:00:00.000Z"
    );
  });

  it("returns null when there is no base due date", () => {
    expect(nextRecurrence(null, "daily", 1, null, NOW)).toBeNull();
  });
});

describe("formatRecurrenceLabel", () => {
  it("labels singular and plural intervals", () => {
    expect(formatRecurrenceLabel("daily", 1)).toBe("Every day");
    expect(formatRecurrenceLabel("weekly", 2)).toBe("Every 2 weeks");
    expect(formatRecurrenceLabel("monthly", 1)).toBe("Every month");
    expect(formatRecurrenceLabel(null, 1)).toBe("Does not repeat");
  });
});
