import type { Task } from "@/types/tasks";
import type { ScheduleEvent } from "@/types/schedule";

/**
 * Task deadlines on the calendar.
 *
 * A task's due date is a single instant, but the calendar grid needs a start/end
 * range, so each due date becomes an **all-day** deadline chip covering the local
 * day it falls on. That is how Google Calendar and Outlook render deadlines, and it
 * keeps the due time out of the hour grid where it would imply a work block — the
 * time itself is still shown on the chip, in the tooltip and in the detail dialog.
 *
 * These events are derived on read rather than stored in `schedule_events`, so there is
 * no second copy to drift: completing a recurring task advances `tasks.due_at` (see
 * `tasksClientService.completeTask`) and the calendar follows on the next visit.
 */

/** Namespaced so a task deadline can never collide with a `schedule_events` uuid. */
export function taskEventId(taskId: string): string {
  return `task:${taskId}`;
}

/** True when `id` belongs to a derived task deadline rather than a stored event. */
export function isTaskEventId(id: string): boolean {
  return id.startsWith("task:");
}

/** Local midnight of the day `iso` falls on. */
function localMidnight(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * `tasksToScheduleEvents` drops undated and completed tasks, and maps each remaining
 * due date into one all-day `assignment` deadline chip.
 *
 * `startAt` keeps the exact instant the user picked in the task form rather than being
 * snapped to midnight, so the due *time* survives; the `allDay` flag is what routes the
 * chip into the all-day lane, and every view buckets by the local day of `startAt`.
 * `endAt` is the next local midnight, which keeps `endAt > startAt` (matching the
 * `schedule_events` check) and makes the deadline touch exactly one day in the grid.
 *
 * The course is carried for display only (via `taskRowToView`, which already resolved
 * it); `color` stays null so the chip keeps the amber `assignment` meaning the calendar
 * legend already teaches.
 */
export function tasksToScheduleEvents(tasks: readonly Task[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  for (const task of tasks) {
    // A completed task's deadline is no longer actionable, and recurring tasks advance
    // their own due_at on completion, so nothing is lost by dropping them.
    if (!task.dueAt || task.status === "done") continue;

    const parsed = Date.parse(task.dueAt);
    if (Number.isNaN(parsed)) continue;

    const dayStart = localMidnight(task.dueAt);
    // Step with setDate rather than +86400000 so a DST change can't shift the end.
    const end = new Date(dayStart);
    end.setDate(dayStart.getDate() + 1);

    events.push({
      id: taskEventId(task.id),
      courseId: task.courseId,
      courseName: task.courseName,
      courseColor: task.courseColor,
      title: task.title,
      description: task.description,
      location: null,
      eventType: "assignment",
      startAt: new Date(parsed).toISOString(),
      endAt: end.toISOString(),
      allDay: true,
      color: null,
      source: "task",
      googleEventId: null,
    });
  }
  return events;
}