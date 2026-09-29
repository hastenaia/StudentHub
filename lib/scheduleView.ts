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

