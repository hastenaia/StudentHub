"use client";

import * as React from "react";
import type { ScheduleEvent } from "@/types/schedule";

export interface GroupedEvent extends ScheduleEvent {
  startMs: number;
  endMs: number;
  hour: number;
  dateKey: string;
  allDayFlag: boolean;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Pre-group events once per `events` change: O(N log N) total instead of
 * O(cells × N log N) when each calendar cell filters+sorts independently.
 */
export function useGroupedEvents(events: ScheduleEvent[]) {
  return React.useMemo(() => {
    const byDay = new Map<string, GroupedEvent[]>();
    const byDayHour = new Map<string, GroupedEvent[]>();
    const decorated: GroupedEvent[] = events.map((e) => {
      const startMs = Date.parse(e.startAt);
      const safeStartMs = Number.isNaN(startMs) ? 0 : startMs;
      const endMs = Date.parse(e.endAt);
      const d = new Date(safeStartMs);
      const dateKey = toDateKey(d);
      const hour = d.getHours();
      const g: GroupedEvent = {
        ...e,
        startMs: safeStartMs,
        endMs: Number.isNaN(endMs) ? safeStartMs : endMs,
        hour,
        dateKey,
        allDayFlag: e.allDay,
      };
      const dayBucket = byDay.get(dateKey);
      if (dayBucket) dayBucket.push(g);
      else byDay.set(dateKey, [g]);
      const hourKey = `${dateKey}:${hour}`;
      const hourBucket = byDayHour.get(hourKey);
      if (hourBucket) hourBucket.push(g);
      else byDayHour.set(hourKey, [g]);
      return g;
    });
    for (const bucket of byDay.values()) bucket.sort((a, b) => a.startMs - b.startMs);
    for (const bucket of byDayHour.values()) bucket.sort((a, b) => a.startMs - b.startMs);
    return { byDay, byDayHour, decorated };
  }, [events]);
}

export function dayKey(date: Date): string {
  return toDateKey(date);
}
