/**
 * View models for the Smart To-Do Tracker. Tasks are assembled server-side by
 * the tasks service into the shapes the UI consumes.
 */

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type RecurrenceFreq = "daily" | "weekly" | "monthly";

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueAt: string | null;
  estimateMinutes: number | null;
  recurrenceFreq: RecurrenceFreq | null;
  recurrenceInterval: number;
  /** weekly: weekdays 0 (Sun)-6 (Sat); monthly: days of month 1-31; empty = repeat from due date. */
  recurrenceDays: number[];
  recurUntil: string | null;
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
}

/** Form payload sent to the client service to create or update a task. */
export type TaskDraft = Pick<
  Task,
  "title" | "status" | "priority" | "tags" | "dueAt" | "estimateMinutes" | "recurrenceFreq" | "recurrenceInterval" | "recurrenceDays" | "recurUntil" | "courseId"
> & { description?: string | null };

export interface TaskCourseOption {
  id: string;
  name: string;
  color: string | null;
}

/** Everything the tasks page needs to render. */
export interface TasksViewData {
  tasks: Task[];
  courses: TaskCourseOption[];
  /** Suggested execution order from `buildSchedule` (lib/scheduling). */
  schedule: import("@/lib/scheduling").ScheduledItem[];
}
