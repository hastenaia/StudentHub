"use client";

import * as React from "react";
import type { ScheduleEvent } from "@/types/schedule";

interface GroupedEvent extends ScheduleEvent {
  startMs: number;
  endMs: number;
  hour: number;
  dateKey: string;
  allDayFlag: boolean;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDayMs(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

const byStart = (a: GroupedEvent, b: GroupedEvent) => a.startMs - b.startMs;

export interface EventRange {
  start: Date;
  end: Date;
}

/**
 * Pre-group events once per `events` change: O(N log N) total instead of
 * O(cells × N log N) when each calendar cell filters+sorts independently.
 *
 * Three groupings, each matching one calendar convention:
 * - `byDay` / `byDayHour` bucket by **start** day only, so a multi-day event appears once
 *   (agenda semantics).
 * - `byDaySpan` repeats an event across **every** day it touches (grid semantics, so a
 *   three-day event shows on all three days). End is exclusive, so an event ending exactly
 *   at 00:00 — a Google all-day event — doesn't also claim the following day.
 *
 * Pass `range` to clamp `byDaySpan` to the days a view actually renders, which keeps a
 * pathologically long event from expanding without bound.
 */
export function useGroupedEvents(events: ScheduleEvent[], range?: EventRange) {
  const fromMs = range ? startOfDayMs(range.start) : null;
  const toMs = range ? startOfDayMs(range.end) : null;

  return React.useMemo(() => {
    const byDay = new Map<string, GroupedEvent[]>();
    const byDayHour = new Map<string, GroupedEvent[]>();
    const byDaySpan = new Map<string, GroupedEvent[]>();
    const decorated: GroupedEvent[] = events.map((e) => {
      const parsedStart = Date.parse(e.startAt);
      const startMs = Number.isNaN(parsedStart) ? 0 : parsedStart;
      const parsedEnd = Date.parse(e.endAt);
      const endMs = Number.isNaN(parsedEnd) ? startMs : parsedEnd;
      const start = new Date(startMs);
      const dateKey = toDateKey(start);
      const grouped: GroupedEvent = {
        ...e,
        startMs,
        endMs,
        hour: start.getHours(),
        dateKey,
        allDayFlag: e.allDay,
      };
      push(byDay, dateKey, grouped);
      push(byDayHour, `${dateKey}:${grouped.hour}`, grouped);

      // Step with setDate, not +24h, so DST changes can't skip or repeat a day.
      // An all-day `endAt` is an *exclusive* next-midnight written in the writer's zone
      // (date-only form input parses as UTC midnight; a UTC sync server stores UTC midnight),
      // so on a viewer east of that zone it lands mid-morning the next local day and
      // `endMs - 1` would claim that day. Take the calendar day of `endAt` and drop back one
      // day instead — identical to `endMs - 1` whenever `endAt` already sits on a local
      // midnight, so only the shifted case changes.
      // ponytail: if the viewer can be west of the writer's zone, store all-day rows as
      // date-only and bucket on their UTC date parts instead.
      const endBoundary = e.allDay ? startOfDayMs(new Date(endMs)) : endMs;
      const last = new Date(Math.max(startMs, endBoundary - 1));
      last.setHours(0, 0, 0, 0);
      const lower = fromMs === null ? startOfDayMs(start) : Math.max(startOfDayMs(start), fromMs);
      const upper = toMs === null ? last.getTime() : Math.min(last.getTime(), toMs);
      for (const cursor = new Date(lower); cursor.getTime() <= upper; cursor.setDate(cursor.getDate() + 1)) {
        push(byDaySpan, toDateKey(cursor), grouped);
      }
      return grouped;
    });
    for (const bucket of byDay.values()) bucket.sort(byStart);
    for (const bucket of byDayHour.values()) bucket.sort(byStart);
    for (const bucket of byDaySpan.values()) bucket.sort(byStart);
    return { byDay, byDayHour, byDaySpan, decorated };
  }, [events, fromMs, toMs]);
}

/** Local `YYYY-M-D` key, matching `toDateKey` above. */
export function dayKey(date: Date): string {
  return toDateKey(date);
}
