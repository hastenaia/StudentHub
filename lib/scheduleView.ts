import type { CalendarView, ScheduleEvent } from "@/types/schedule";
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
/** Half-open `[start, end)` window. */
type DateRange = [Date, Date];

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

export interface EventSourceCounts {
  userCount: number;
  googleCount: number;
  taskCount: number;
}

/** Tally the calendar footer. Kept pure and exhaustive so a new `source` can't be miscounted. */
export function countEventSources(events: readonly Pick<ScheduleEvent, "source">[]): EventSourceCounts {
  const counts: EventSourceCounts = { userCount: 0, googleCount: 0, taskCount: 0 };
  for (const e of events) {
    if (e.source === "google") counts.googleCount++;
    else if (e.source === "task") counts.taskCount++;
    else counts.userCount++;
  }
  return counts;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The month grid renders whole weeks, so pad to the Sunday before the 1st and the Saturday
 * after the last day. Otherwise a leading event would vanish on the 1st and a trailing one on
 * the 31st. Uses calendar-day arithmetic, not +86_400_000, to stay correct across DST shifts.
 */
function monthGridRange(currentDate: Date): DateRange {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  start.setDate(start.getDate() - start.getDay());
  end.setDate(end.getDate() + (6 - end.getDay()));
  return [start, end];
}

function weekRange(currentDate: Date): DateRange {
  const start = startOfWeek(currentDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return [start, end];
}

function dayRange(currentDate: Date): DateRange {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

/**
 * Half-open `[start, end)` window a view should display. Agenda returns the whole timeline —
 * it paginates on its own rather than clipping to the visible period.
 */
export function viewRange(view: CalendarView, currentDate: Date): DateRange {
  if (view === "month") return monthGridRange(currentDate);
  if (view === "week") return weekRange(currentDate);
  if (view === "day") return dayRange(currentDate);
  return [new Date(-8.64e15), new Date(8.64e15)];
}

/** Toolbar heading for the visible period. */
export function viewHeaderLabel(view: CalendarView, currentDate: Date): string {
  if (view === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (view === "week") {
    const s = startOfWeek(currentDate);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  if (view === "day")
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return "Agenda";
}

/**
 * Advance the visible period by one step. Month steps use `setMonth` so short months need no
 * special-casing. Note this overflows rather than clamping: stepping forward from 31 Jan lands
 * on 3 Mar, which matches the month view's own previous/next behaviour.
 */
export function stepPeriod(view: CalendarView, currentDate: Date, direction: 1 | -1): Date {
  const d = new Date(currentDate);
  if (view === "month") d.setMonth(d.getMonth() + direction);
  else d.setDate(d.getDate() + direction * (view === "week" ? 7 : 1));
  return d;
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
