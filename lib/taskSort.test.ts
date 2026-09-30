import { describe, expect, it } from "vitest";
import { sortTasks } from "./taskSort";
import type { Task } from "@/types/tasks";

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: null,
  status: "todo",
  priority: "medium",
  tags: [],
  dueAt: null,
  estimateMinutes: null,
  recurrenceFreq: null,
  recurrenceInterval: 1,
  recurUntil: null,
  courseId: null,
  courseName: null,
  courseColor: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

const ids = (tasks: Task[]) => tasks.map((t) => t.id);
const noOrder = new Map<string, number>();

describe("sortTasks", () => {
  it("always sinks done tasks", () => {
    const tasks = [task("done", { status: "done", sortOrder: 0 }), task("open", { sortOrder: 1 })];
    expect(ids(sortTasks(tasks, noOrder, "smart"))).toEqual(["open", "done"]);
  });

  it("smart: suggested rank, unranked last, then manual order", () => {
    const tasks = [task("a", { sortOrder: 2 }), task("b", { sortOrder: 1 }), task("c", { sortOrder: 0 })];
    expect(ids(sortTasks(tasks, new Map([["a", 0]]), "smart"))).toEqual(["a", "c", "b"]);
  });

  it("deadline: earliest first, undated last by manual order", () => {
    const tasks = [
      task("none2", { sortOrder: 2 }),
      task("late", { dueAt: "2026-09-20T00:00:00Z" }),
      task("none1", { sortOrder: 1 }),
      task("soon", { dueAt: "2026-09-10T00:00:00Z" }),
    ];
    expect(ids(sortTasks(tasks, noOrder, "deadline"))).toEqual(["soon", "late", "none1", "none2"]);
  });

  it("priority: weight, then due date, then manual order", () => {
    const tasks = [
      task("low", { priority: "low" }),
      task("highLate", { priority: "high", dueAt: "2026-09-20T00:00:00Z" }),
      task("highSoon", { priority: "high", dueAt: "2026-09-10T00:00:00Z" }),
      task("urgent", { priority: "urgent" }),
    ];
    expect(ids(sortTasks(tasks, noOrder, "priority"))).toEqual(["urgent", "highSoon", "highLate", "low"]);
  });

  it("effort: smallest estimate first, missing estimates last", () => {
    const tasks = [task("none"), task("big", { estimateMinutes: 90 }), task("small", { estimateMinutes: 15 })];
    expect(ids(sortTasks(tasks, noOrder, "effort"))).toEqual(["small", "big", "none"]);
  });

  it("created: newest first", () => {
    const tasks = [task("old", { createdAt: "2026-01-01T00:00:00Z" }), task("new", { createdAt: "2026-09-01T00:00:00Z" })];
    expect(ids(sortTasks(tasks, noOrder, "created"))).toEqual(["new", "old"]);
  });
});
