import type { ScheduleEvent } from "@/types/schedule";
import {
  CHIP_TEXT_DARK,
  CHIP_TEXT_LIGHT,
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

/** WCAG 2.1 relative luminance. Returns `null` when `hex` isn't a 3- or 6-digit hex colour. */
export function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const packed = parseInt(digits, 16);
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((packed >> 16) & 255) +
    0.7152 * channel((packed >> 8) & 255) +
    0.0722 * channel(packed & 255)
  );
}

/** WCAG contrast ratio between two relative luminances; always >= 1. */
export function contrastRatio(a: number, b: number): number {
  const [lighter, darker] = a >= b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Text colour that stays legible on an arbitrary `bg`. A custom event colour comes from a
 * free-form colour input, so it has no curated `EVENT_TYPE_ON_COLOR` pairing to fall back
 * on; unparseable colours keep white text rather than guessing.
 */
export function readableTextColor(bg: string): string {
  const luminance = relativeLuminance(bg);
  if (luminance === null) return CHIP_TEXT_LIGHT;
  const onDark = contrastRatio(luminance, relativeLuminance(CHIP_TEXT_DARK) ?? 0);
  const onLight = contrastRatio(luminance, relativeLuminance(CHIP_TEXT_LIGHT) ?? 0);
  return onDark > onLight ? CHIP_TEXT_DARK : CHIP_TEXT_LIGHT;
}

/**
 * Single source of truth for event colouring, shared by every calendar view. An explicit
 * per-event colour wins (with text contrast derived from it), otherwise the type's curated
 * palette applies. Google events are slightly transparent so they read as read-only.
 */
export function eventTypeStyle(event: Pick<ScheduleEvent, "eventType" | "color" | "source">): EventChipStyle {
  const type = isScheduleEventType(event.eventType) ? event.eventType : "other";
  return {
    bg: event.color || EVENT_TYPE_COLOR[type],
    fg: event.color ? readableTextColor(event.color) : EVENT_TYPE_ON_COLOR[type],
    opacity: event.source === "google" ? 0.85 : 1,
  };
}

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
    // `event_type` is NOT NULL and check-constrained, so an unrecognised value is corrupt data,
    // not a hint to guess at — unlike Google rows below, which have no stored type at all.
    eventType: isScheduleEventType(row.event_type) ? row.event_type : "other",
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
