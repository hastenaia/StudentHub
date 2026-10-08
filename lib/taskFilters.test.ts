import { describe, expect, it } from "vitest";
import {
  buildTaskSearchIndex,
  completionToastTitle,
  EMPTY_TASK_FILTERS,
  filterTasks,
  hasActiveTaskFilters,
  reopenedTask,
  toScheduleInputs,
  type TaskFilters,
} from "./taskFilters";
import { matchesCourseFilter } from "./courseView";
import { withXpToast } from "./gamification";
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
  recurrenceDays: [],
  recurUntil: null,
  courseId: null,
  courseName: null,
  courseColor: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

describe("filterTasks", () => {
  const tasks = [
    task("essay", { description: "Draft INTRO", tags: ["writing"], priority: "high", courseId: "c1", courseName: "English" }),
    task("lab", { status: "in_progress", tags: ["bio"] }),
    task("quiz", { status: "done", priority: "low", courseId: "c2" }),
  ];
  const index = buildTaskSearchIndex(tasks);
  const ids = (f: Partial<TaskFilters>) => filterTasks(tasks, index, { ...EMPTY_TASK_FILTERS, ...f }).map((t) => t.id);

  it("returns everything without filters", () => {
    expect(ids({})).toEqual(["essay", "lab", "quiz"]);
    expect(hasActiveTaskFilters(EMPTY_TASK_FILTERS)).toBe(false);
  });

  it("searches title, description, tags and course case-insensitively", () => {
    expect(ids({ query: " intro " })).toEqual(["essay"]);
    expect(ids({ query: "BIO" })).toEqual(["lab"]);
    expect(ids({ query: "english" })).toEqual(["essay"]);
  });

  it("filters by status, priority and course", () => {
    expect(ids({ status: "in_progress" })).toEqual(["lab"]);
    expect(ids({ priority: "low" })).toEqual(["quiz"]);
    expect(ids({ course: "none" })).toEqual(["lab"]);
    expect(ids({ course: "c1", priority: "high" })).toEqual(["essay"]);
  });

  it.each<Partial<TaskFilters>>([{ query: "x" }, { status: "done" }, { priority: "high" }, { course: "none" }])("hasActiveTaskFilters(%o)", (f) => {
    expect(hasActiveTaskFilters({ ...EMPTY_TASK_FILTERS, ...f })).toBe(true);
  });

  it("ignores a whitespace-only query", () => {
    expect(hasActiveTaskFilters({ ...EMPTY_TASK_FILTERS, query: "   " })).toBe(false);
  });
});

describe("task helpers", () => {
  it("toScheduleInputs drops done tasks and keeps scheduling fields", () => {
    const out = toScheduleInputs([task("a", { dueAt: "2026-09-02T00:00:00Z", estimateMinutes: 30 }), task("b", { status: "done" })]);
    expect(out).toEqual([{ id: "a", title: "a", priority: "medium", dueAt: "2026-09-02T00:00:00Z", estimateMinutes: 30 }]);
  });

  it("reopenedTask moves a done task to the top of To do", () => {
    expect(reopenedTask(task("a", { status: "done", completedAt: "x", sortOrder: 4 }))).toMatchObject({ status: "todo", completedAt: null, sortOrder: 0 });
  });

  it("completionToastTitle distinguishes recurring tasks", () => {
    expect(completionToastTitle("done")).toBe("Task completed");
    expect(completionToastTitle("todo")).toBe("Next occurrence scheduled");
  });

  it("matchesCourseFilter handles all, none and a course id", () => {
    expect(matchesCourseFilter("c1", "all")).toBe(true);
    expect(matchesCourseFilter(null, "none")).toBe(true);
    expect(matchesCourseFilter("c1", "none")).toBe(false);
    expect(matchesCourseFilter("c1", "c1")).toBe(true);
    expect(matchesCourseFilter("c2", "c1")).toBe(false);
  });

  it("withXpToast appends the XP award when there is one", () => {
    expect(withXpToast("Task updated.", null)).toBe("Task updated.");
    expect(withXpToast("Done.", { awarded: true, xp: 10, streak: 1, newBadges: [] } as never)).toBe("Done. · +10 XP");
    expect(withXpToast(undefined, undefined)).toBe("");
  });
});
