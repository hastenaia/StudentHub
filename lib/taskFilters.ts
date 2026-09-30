import type { Task, TaskPriority, TaskStatus } from "@/types/tasks";
import type { ScheduleInput } from "@/lib/scheduling";
import { matchesCourseFilter } from "@/lib/courseView";

export interface TaskFilters {
  query: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  /** "all", "none" (no course) or a course id. */
  course: string;
}

export const EMPTY_TASK_FILTERS: TaskFilters = { query: "", status: "all", priority: "all", course: "all" };

export function hasActiveTaskFilters(f: TaskFilters): boolean {
  return f.query.trim() !== "" || f.status !== "all" || f.priority !== "all" || f.course !== "all";
}

/** Lower-cased search text per task id, computed once per tasks change — one includes() per task per keystroke. */
export function buildTaskSearchIndex(tasks: Task[]): Map<string, string> {
  return new Map(tasks.map((t) => [t.id, [t.title, t.description, t.tags.join(" "), t.courseName].filter(Boolean).join(" ").toLowerCase()]));
}

export function filterTasks(tasks: Task[], index: Map<string, string>, f: TaskFilters): Task[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!q || (index.get(t.id) ?? "").includes(q)) &&
      (f.status === "all" || t.status === f.status) &&
      (f.priority === "all" || t.priority === f.priority) &&
      matchesCourseFilter(t.courseId, f.course)
  );
}

export const TASK_STATUS_FILTER_LABEL: Record<TaskStatus, string> = {
  todo: "TODO",
  in_progress: "IN PROGRESS",
  done: "COMPLETED",
};

/** Scheduler input: every task that isn't done. */
export function toScheduleInputs(tasks: Task[]): ScheduleInput[] {
  return tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, estimateMinutes: t.estimateMinutes }));
}

/** A done task moved back to the top of To do. */
export function reopenedTask(task: Task): Task {
  return { ...task, status: "todo", completedAt: null, sortOrder: 0 };
}

/** Completing a recurring task schedules its next occurrence instead of finishing it. */
export function completionToastTitle(status: string): string {
  return status === "done" ? "Task completed" : "Next occurrence scheduled";
}
