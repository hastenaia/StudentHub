import type { Task, TaskCourseOption, TaskDraft } from "@/types/tasks";
import type { Database } from "@/types/database.types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/** Map a raw tasks row (DB snake_case) to the UI view model. */
export function taskRowToView(row: TaskRow, courseMap: Map<string, TaskCourseOption>): Task {
  const course = row.course_id ? courseMap.get(row.course_id) : undefined;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    tags: row.tags ?? [],
    dueAt: row.due_at,
    estimateMinutes: row.estimate_minutes,
    recurrenceFreq: row.recurrence_freq as Task["recurrenceFreq"],
    recurrenceInterval: row.recurrence_interval,
    recurUntil: row.recur_until,
    courseId: row.course_id,
    courseName: course?.name ?? null,
    courseColor: course?.color ?? null,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

/** Build an edit-form draft from an existing task view model. */
export function taskToDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    dueAt: task.dueAt,
    estimateMinutes: task.estimateMinutes,
    recurrenceFreq: task.recurrenceFreq,
    recurrenceInterval: task.recurrenceInterval,
    recurUntil: task.recurUntil,
    courseId: task.courseId,
  };
}
