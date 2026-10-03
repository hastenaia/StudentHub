"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { eventTypeStyle } from "@/lib/scheduleView";
import type { ScheduleEvent } from "@/types/schedule";
import { formatDate, formatTime } from "@/utils/date";

interface EventChipProps {
  event: ScheduleEvent;
  /** Month cells are wide enough for the start time; dense week/hour cells stay title-only. */
  showTime?: boolean;
  /** `row` is the day-view treatment: title left, time range right. */
  layout?: "chip" | "row";
  /** Chips sit inside a clickable grid cell, so they stop the click from reaching it. */
  onClick?: (event: ScheduleEvent) => void;
  className?: string;
}

/**
 * The one event chip used by the month, week and day views. Colour comes from
 * `eventTypeStyle`, so all three agree, and read-only sources (Google sync, task
 * deadlines) get a screen-reader-readable marker rather than a bare glyph.
 */
export function EventChip({ event, showTime = false, layout = "chip", onClick, className }: EventChipProps) {
  const style = eventTypeStyle(event);

  const interactive = React.useMemo(() => {
    if (!onClick) return {};
    return {
      role: "button" as const,
      tabIndex: 0,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(event);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        onClick(event);
      },
    };
  }, [onClick, event]);

  if (layout === "row") {
    return (
      <span
        {...interactive}
        className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm font-medium", className)}
        style={{ backgroundColor: style.bg, color: style.fg, opacity: style.opacity }}
      >
        <span className="truncate">{event.title}</span>
        <span className="ml-auto shrink-0 text-xs opacity-80">{whenLabel(event)}</span>
        {event.source === "google" && <GoogleMarker withLabel />}
        {event.source === "task" && <TaskMarker withLabel />}
      </span>
    );
  }

  return (
    <span
      {...interactive}
      className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", className)}
      style={{ backgroundColor: style.bg, color: style.fg, opacity: style.opacity }}
      title={tooltip(event)}
    >
      {chipTimePrefix(event, showTime)}
      {event.title}
      {event.source === "google" && <GoogleMarker />}
      {event.source === "task" && <TaskMarker />}
    </span>
  );
}

/**
 * A task deadline renders as an all-day chip, which normally hides its clock time — but
 * the user picked one in the task form, so it is surfaced rather than silently dropped.
 */
function whenLabel(event: ScheduleEvent): string {
  if (event.source !== "task") {
    return event.allDay ? "All day" : `${formatTime(event.startAt)} - ${formatTime(event.endAt)}`;
  }
  return `Due ${formatTime(event.startAt)}`;
}

/**
 * Time prefix for the compact chip. A real all-day event stays title-only — there is no
 * meaningful clock time on it. A task deadline is different: its `allDay` flag is only a
 * routing device for the all-day lane, so its due time is the one piece of information
 * the chip would otherwise drop, and views with room (the day view's all-day lane) ask
 * for it.
 */
function chipTimePrefix(event: ScheduleEvent, showTime: boolean): string {
  if (!showTime) return "";
  if (event.source === "task") return `Due ${formatTime(event.startAt)} `;
  return event.allDay ? "" : `${formatTime(event.startAt)} `;
}

function tooltip(event: ScheduleEvent): string {
  if (event.source === "task") {
    return `Due ${formatDate(event.startAt)}, ${formatTime(event.startAt)} — ${event.title}`;
  }
  return event.allDay ? event.title : `${formatTime(event.startAt)} ${event.title}`;
}

/** Dot-only in dense chips; labelled in roomier ones. Always announced to screen readers. */
function GoogleMarker({ withLabel = false }: { withLabel?: boolean }) {
  return (
    <>
      <span className="opacity-70">
        <span aria-hidden>•</span>
        {withLabel ? " Google" : null}
      </span>
      <span className="sr-only"> (Google Calendar, read-only)</span>
    </>
  );
}

/** Marks a deadline derived from a task, which is editable on the Tasks page only. */
function TaskMarker({ withLabel = false }: { withLabel?: boolean }) {
  return (
    <>
      <span className="opacity-70">
        <span aria-hidden>•</span>
        {withLabel ? " Task" : null}
      </span>
      <span className="sr-only"> (task due date)</span>
    </>
  );
}
