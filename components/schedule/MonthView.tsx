"use client";

import { cn } from "@/utils/cn";
import { eventTypeStyle } from "@/lib/scheduleView";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";
import * as React from "react";
import { useGroupedEvents } from "@/hooks/useGroupedEvents";

interface MonthViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onDateClick: (date: Date) => void;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  const start = startOfMonth(currentDate);
  const totalDays = daysInMonth(currentDate);
  const startDay = start.getDay(); // 0 Sun

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  // Start-day buckets sorted once; spanning events expanded across days in one pass.
  const { decorated } = useGroupedEvents(events);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { dayMap, countMap } = React.useMemo(() => {
    const map = new Map<string, typeof decorated>();
    const counts = new Map<string, number>();
    const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    // Only this month's cells are rendered, so clamp each span to it (no fixed day cap needed).
    const firstMs = new Date(year, month, 1).getTime();
    const lastMs = new Date(year, month + 1, 0).getTime();
    for (const e of decorated) {
      const startDay = new Date(e.startMs);
      startDay.setHours(0, 0, 0, 0);
      // End is exclusive: an event ending exactly at 00:00 (e.g. Google all-day events) doesn't touch that day.
      const endDay = new Date(Math.max(e.startMs, e.endMs - 1));
      endDay.setHours(0, 0, 0, 0);
      const from = new Date(Math.max(startDay.getTime(), firstMs));
      const toMs = Math.min(endDay.getTime(), lastMs);
      // Step with setDate, not +24h, so DST changes can't skip or repeat a day.
      for (const d = from; d.getTime() <= toMs; d.setDate(d.getDate() + 1)) {
        const k = keyOf(d);
        const bucket = map.get(k);
        if (bucket) bucket.push(e);
        else map.set(k, [e]);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    for (const bucket of map.values()) bucket.sort((a, b) => a.startMs - b.startMs);
    return { dayMap: map, countMap: counts };
  }, [decorated, year, month]);

  const dayEvents = (date: Date) =>
    (dayMap.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? []).slice(0, 3);

  const overflowCount = (date: Date) => {
    const count = countMap.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? 0;
    return count > 3 ? count - 3 : 0;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-brand-gray">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 auto-rows-fr">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="min-h-[96px] bg-white" />;
          }
          const evs = dayEvents(date);
          const overflow = overflowCount(date);
          return (
            <button
              key={idx}
              onClick={() => onDateClick(date)}
              className={cn(
                "min-h-[96px] bg-white p-1 text-left hover:bg-brand-gray/40",
                isToday(date) && "ring-2 ring-inset ring-brand-royal"
              )}
            >
              <div className={cn("text-xs font-medium", isToday(date) ? "font-bold text-brand-royal" : "text-gray-700")}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {evs.map((e) => {
                  const chip = eventTypeStyle(e);
                  return (
                    <div
                      key={e.id}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onEventClick(e);
                      }}
                      className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: chip.bg, color: chip.fg, opacity: chip.opacity }}
                      title={`${e.title} ${e.allDay ? "" : formatTime(e.startAt)}`}
                    >
                      {e.allDay ? "" : formatTime(e.startAt) + " "}
                      {e.title}
                      {e.source === "google" ? " •" : ""}
                    </div>
                  );
                })}
                {overflow > 0 && <div className="text-[11px] text-gray-400">+{overflow} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
