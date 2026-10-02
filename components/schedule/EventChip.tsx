"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { eventTypeStyle } from "@/lib/scheduleView";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";

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
 * `eventTypeStyle`, so all three agree, and Google events get a screen-reader-readable
 * read-only marker rather than a bare glyph.
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
        <span className="ml-auto shrink-0 text-xs opacity-80">
          {formatTime(event.startAt)} - {formatTime(event.endAt)}
        </span>
        {event.source === "google" && <GoogleMarker withLabel />}
      </span>
    );
  }

  return (
    <span
      {...interactive}
      className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", className)}
      style={{ backgroundColor: style.bg, color: style.fg, opacity: style.opacity }}
      title={event.allDay ? event.title : `${formatTime(event.startAt)} ${event.title}`}
    >
      {!event.allDay && showTime ? `${formatTime(event.startAt)} ` : ""}
      {event.title}
      {event.source === "google" && <GoogleMarker />}
    </span>
  );
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
