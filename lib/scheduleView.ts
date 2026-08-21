import type { ScheduleEvent, ScheduleEventType } from "@/types/schedule";
import type { Database } from "@/types/database.types";

type ScheduleRow = Database["public"]["Tables"]["schedule_events"]["Row"];
type CalendarRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export function scheduleRowToView(
  row: ScheduleRow,
  courseMap: Map<string, { name: string; color: string | null }>
): ScheduleEvent {
  const course = row.course_id ? courseMap.get(row.course_id) : undefined;
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: course?.name ?? null,
    courseColor: course?.color ?? null,
    title: row.title,
    description: row.description,
    location: row.location,
    eventType: row.event_type as ScheduleEventType,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    color: row.color,
    source: "user",
  };
}

export function calendarRowToView(row: CalendarRow): ScheduleEvent {
  return {
    id: row.id,
    courseId: null,
    courseName: null,
    courseColor: null,
    title: row.summary,
    description: row.description,
    location: row.location,
    eventType: "other",
    startAt: row.start_at ?? row.created_at,
    endAt: row.end_at ?? row.start_at ?? row.created_at,
    allDay: row.all_day,
    color: null,
    source: "google",
    googleEventId: row.google_event_id,
  };
}

export function draftToRow(draft: import("@/types/schedule").ScheduleDraft, userId: string) {
  return {
    user_id: userId,
    course_id: draft.courseId || null,
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    location: draft.location?.trim() || null,
    event_type: draft.eventType,
    start_at: draft.allDay ? toDateOnly(draft.startAt) : draft.startAt,
    end_at: draft.allDay ? toDateOnly(draft.endAt, true) : draft.endAt,
    all_day: draft.allDay,
    color: draft.color || null,
  };
}

function toDateOnly(iso: string, endOfDay = false): string {
  const d = new Date(iso);
  if (endOfDay) {
    // For all-day, end is exclusive next day at midnight; keep as given
    return d.toISOString();
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
