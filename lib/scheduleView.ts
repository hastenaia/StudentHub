import type { ScheduleEvent } from "@/types/schedule";
import {
  EVENT_TYPE_COLOR,
  EVENT_TYPE_ON_COLOR,
  isScheduleEventType,
} from "@/types/schedule";
import type { Database } from "@/types/database.types";
import { inferEventType } from "@/lib/eventTypeInference";

type ScheduleRow = Database["public"]["Tables"]["schedule_events"]["Row"];
type CalendarRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export interface EventChipStyle {
  bg: string;
  fg: string;
  opacity: number;
}

/**
 * Single source of truth for event colouring. An explicit per-event colour wins,
 * otherwise the type's palette applies. Google events are slightly transparent
 * so they read as read-only.
 */
export function eventTypeStyle(event: Pick<ScheduleEvent, "eventType" | "color" | "source">): EventChipStyle {
  const type = isScheduleEventType(event.eventType) ? event.eventType : "other";
  return {
    bg: event.color || EVENT_TYPE_COLOR[type],
    fg: event.color ? "#FFFFFF" : EVENT_TYPE_ON_COLOR[type],
    opacity: event.source === "google" ? 0.85 : 1,
  };
}

export function scheduleRowToView(
  row: ScheduleRow,
  courseMap: Map<string, { name: string; color: string | null }>
): ScheduleEvent {
  const course = row.course_id ? courseMap.get(row.course_id) : undefined;
  const fallback = inferEventType(row.title, row.description).type;
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: course?.name ?? null,
    courseColor: course?.color ?? null,
    title: row.title,
    description: row.description,
    location: row.location,
    eventType: isScheduleEventType(row.event_type) ? row.event_type : fallback,
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
    eventType: inferEventType(row.summary, row.description).type,
    startAt: row.start_at ?? row.created_at,
    endAt: row.end_at ?? row.start_at ?? row.created_at,
    allDay: row.all_day,
    color: null,
    source: "google",
    googleEventId: row.google_event_id,
  };
}
