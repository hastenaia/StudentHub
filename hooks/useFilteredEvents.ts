"use client";

import * as React from "react";
import { viewRange } from "@/lib/scheduleView";
import type { CalendarView, ScheduleEvent } from "@/types/schedule";

interface Decorated {
  e: ScheduleEvent;
  s: number;
  ee: number;
}

/** Parse timestamps once so the filter and the sort below don't re-parse per comparison. */
function decorate(events: readonly ScheduleEvent[]): Decorated[] {
  return events.map((e) => ({ e, s: Date.parse(e.startAt) || 0, ee: Date.parse(e.endAt) || 0 }));
}

/**
 * Events the current view should display.
 *
 * Month/week/day clip to the visible period, keeping anything that *overlaps* it rather than
 * merely starting inside it — a multi-day class spanning the 1st still shows. Agenda isn't a
 * period, so it returns everything sorted by start and lets the view paginate.
 */
export function useFilteredEvents(
  events: readonly ScheduleEvent[],
  view: CalendarView,
  currentDate: Date
): ScheduleEvent[] {
  return React.useMemo(() => {
    const decorated = decorate(events);
    if (view === "agenda") return decorated.sort((a, b) => a.s - b.s).map((d) => d.e);

    const [start, end] = viewRange(view, currentDate);
    const startMs = start.getTime();
    const endMs = end.getTime();
    return decorated
      .filter((d) => d.s < endMs && d.ee > startMs)
      .sort((a, b) => a.s - b.s)
      .map((d) => d.e);
  }, [events, view, currentDate]);
}