import { describe, expect, it } from "vitest";
import {
  buildDailyPlan,
  computeFreeWindows,
  type PlanAssignmentInput,
  type PlanTaskInput,
} from "./dailyPlan";

function at(y: number, m: number, d: number, h = 12, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

function task(overrides: Partial<PlanTaskInput> = {}): PlanTaskInput {
  return {
    id: "t1",
    title: "Task 1",
    priority: "medium",
    dueAt: null,
    estimateMinutes: null,
    status: "todo",
    ...overrides,
  };
}

function assignment(overrides: Partial<PlanAssignmentInput> = {}): PlanAssignmentInput {
  return {
    id: "a1",
    title: "Essay",
    courseId: "c1",
    courseName: "History",
    dueAt: at(2026, 8, 22, 17).toISOString(),
    ...overrides,
  };
}

const now = at(2026, 8, 21, 15); // Friday 15:00

describe("buildDailyPlan ordering", () => {
  it("ranks overdue work first regardless of source", () => {
    const plan = buildDailyPlan(
      [task({ id: "t", dueAt: at(2026, 8, 20).toISOString(), priority: "low" })],
      [assignment({ id: "a", dueAt: at(2026, 8, 19).toISOString() })],
      [],
      now
    );
    expect(plan.items[0].kind).toBe("assignment");
    expect(plan.items[0].reason).toContain("overdue");
    expect(plan.items[1].kind).toBe("task");
  });

  it("puts things due within 24h above things due in a few days", () => {
    const plan = buildDailyPlan(
      [task({ id: "later", dueAt: at(2026, 8, 24).toISOString(), priority: "urgent" })],
      [assignment({ id: "soon", dueAt: at(2026, 8, 22, 9).toISOString() })],
      [],
      now
    );
    expect(plan.items[0].id).toBe("soon");
    expect(plan.items[1].id).toBe("later");
  });

  it("breaks ties inside a tier by exact due time, then priority", () => {
    const plan = buildDailyPlan(
      [
        task({ id: "task-5pm", dueAt: at(2026, 8, 22, 18).toISOString(), priority: "high" }),
        task({ id: "task-9am", dueAt: at(2026, 8, 22, 9).toISOString(), priority: "low" }),
      ],
      [assignment({ id: "assig-noon", dueAt: at(2026, 8, 22, 12).toISOString() })],
      [],
      now
    );
    expect(plan.items.map((i) => i.id)).toEqual(["task-9am", "assig-noon", "task-5pm"]);
  });

  it("sinks undated tasks below everything dated and notes priority", () => {
    const plan = buildDailyPlan(
      [task({ id: "undated", title: "Read chapter" }), task({ id: "dated", dueAt: at(2026, 8, 30).toISOString() })],
      [],
      [],
      now
    );
    expect(plan.items[0].id).toBe("dated");
    expect(plan.items[1].id).toBe("undated");
    expect(plan.items[1].reason).toBe("no due date");
  });

  it("sums estimated effort across items", () => {
    const plan = buildDailyPlan(
      [task({ estimateMinutes: 45 }), task({ id: "t2", estimateMinutes: 30 })],
      [],
      [],
      now
    );
    expect(plan.plannedMinutes).toBe(75);
  });
});

describe("computeFreeWindows", () => {
  it("finds the gap between two afternoon classes", () => {
    const windows = computeFreeWindows(
      [
        { summary: "Math", startAt: at(2026, 8, 21, 13).toISOString(), endAt: at(2026, 8, 21, 14).toISOString(), allDay: false },
        { summary: "Lab", startAt: at(2026, 8, 21, 16).toISOString(), endAt: at(2026, 8, 21, 17, 30).toISOString(), allDay: false },
      ],
      now // 15:00 — before the gap
    );
    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({ minutes: 60 }); // 15:00–16:00
    expect(windows[1].minutes).toBeGreaterThan(200); // 17:30–22:00
  });

  it("clips windows to now when the free time already started", () => {
    const windows = computeFreeWindows(
      [{ summary: "Seminar", startAt: at(2026, 8, 21, 18).toISOString(), endAt: at(2026, 8, 21, 19).toISOString(), allDay: false }],
      at(2026, 8, 21, 15, 30)
    );
    expect(windows[0].minutes).toBe(150); // 15:30–18:00
  });

  it("ignores all-day events and returns nothing after study hours", () => {
    expect(computeFreeWindows([{ summary: "Holiday", startAt: null, endAt: null, allDay: true }], now)).toHaveLength(1);
    expect(computeFreeWindows([], at(2026, 8, 21, 23))).toHaveLength(0);
  });

  it("drops gaps shorter than the minimum useful window", () => {
    const windows = computeFreeWindows(
      [
        { summary: "A", startAt: at(2026, 8, 21, 16).toISOString(), endAt: at(2026, 8, 21, 16, 50).toISOString(), allDay: false },
        { summary: "B", startAt: at(2026, 8, 21, 17).toISOString(), endAt: at(2026, 8, 21, 18).toISOString(), allDay: false },
      ],
      now
    );
    // The 10-minute gap between A and B is not worth suggesting.
    expect(windows.some((w) => w.minutes === 10)).toBe(false);
  });
});
