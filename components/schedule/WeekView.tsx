"use client";

import { cn } from "@/utils/cn";
import type { ScheduleEvent } from "@/types/schedule";
import { dayKey, useGroupedEvents } from "@/hooks/useGroupedEvents";
import { EventChip } from "@/components/schedule/EventChip";

interface WeekViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onTimeClick: (date: Date, hour: number) => void;
}

/** The grid shows a working day; anything outside it falls into the "other times" strip below. */
const FIRST_HOUR = 7;
const LAST_HOUR = 18;

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function WeekView({ currentDate, events, onEventClick, onTimeClick }: WeekViewProps) {
  // Step with setDate, not +24h, so a DST change inside the week can't skip or repeat a day.
  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
  const gridEnd = new Date(days[6]);
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => i + FIRST_HOUR);

  // Span grouping so a multi-day event shows on each day it covers, not just its first.
  const { byDayHour, byDaySpan } = useGroupedEvents(events, { start, end: gridEnd });

  // Ids already drawn in the hour grid, so the "other times" strip only adds what it must.
  const drawnInGrid = new Map<string, Set<string>>();
  for (const day of days) {
    const key = dayKey(day);
    const ids = new Set<string>();
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
      for (const e of byDayHour.get(`${key}:${hour}`) ?? []) {
        if (!e.allDayFlag) ids.add(e.id);
      }
    }
    drawnInGrid.set(key, ids);
  }

  const allDayFor = (key: string) => (byDaySpan.get(key) ?? []).filter((e) => e.allDayFlag);
  const otherFor = (key: string) =>
    (byDaySpan.get(key) ?? []).filter((e) => !e.allDayFlag && !drawnInGrid.get(key)?.has(e.id));

  const todayKey = dayKey(new Date());
  const weekHasAllDay = days.some((d) => allDayFor(dayKey(d)).length > 0);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-8 border-b border-gray-200 bg-brand-gray">
        <div className="px-2 py-2 text-xs font-medium text-gray-600">Time</div>
        {days.map((d) => {
          const key = dayKey(d);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={cn("border-l border-gray-200 px-1 py-2 text-center", isToday && "bg-brand-royal/10")}
            >
              <div className="text-xs font-medium text-gray-600">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={cn("text-sm font-semibold", isToday ? "text-brand-royal" : "text-gray-700")}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {weekHasAllDay && (
        <div className="grid grid-cols-8 border-b border-gray-200 bg-brand-gray/30">
          <div className="px-2 py-2 text-xs font-medium text-gray-600">All day</div>
          {days.map((day) => {
            const allDay = allDayFor(dayKey(day));
            return (
              <div key={dayKey(day)} className="min-h-[28px] space-y-1 border-l border-gray-200 p-1">
                {allDay.map((e) => (
                  <EventChip key={e.id} event={e} onClick={onEventClick} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="max-h-[480px] overflow-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
            <div className="border-r border-gray-100 px-2 py-2 text-xs text-gray-500">{hourLabel(hour)}</div>
            {days.map((day) => {
              const key = dayKey(day);
              const hourEvents = (byDayHour.get(`${key}:${hour}`) ?? []).filter((e) => !e.allDayFlag);
              return (
                <button
                  key={`${key}:${hour}`}
                  onClick={() => onTimeClick(day, hour)}
                  aria-label={`Add event ${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${hourLabel(hour)}`}
                  className="min-h-[40px] border-r border-gray-100 bg-white p-1 text-left align-top hover:bg-brand-gray/40"
                >
                  {hourEvents.map((e) => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} className="mb-0.5" />
                  ))}
                </button>
              );
            })}
          </div>
        ))}
        <div className="bg-white p-2">
          {days.map((day) => {
            const other = otherFor(dayKey(day));
            if (other.length === 0) return null;
            return (
              <div key={dayKey(day)} className="mt-2 first:mt-0">
                <div className="text-xs font-medium text-gray-500">
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — other times
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {other.map((e) => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} className="px-2 py-1 text-xs" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
