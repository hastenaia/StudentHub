"use client";

import type { ScheduleEvent } from "@/types/schedule";
import { dayKey, useGroupedEvents } from "@/hooks/useGroupedEvents";
import { EventChip } from "@/components/schedule/EventChip";

interface DayViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onTimeClick: (hour: number) => void;
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function DayView({ currentDate, events, onEventClick, onTimeClick }: DayViewProps) {
  const key = dayKey(currentDate);
  // Span grouping, so an event carried over from yesterday still appears on this day.
  const { byDaySpan } = useGroupedEvents(events, { start: currentDate, end: currentDate });
  const dayEvents = byDaySpan.get(key) ?? [];
  const allDayEvents = dayEvents.filter((e) => e.allDayFlag);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Clip each event to this day, then claim the hours it actually covers here — so an event
  // that began yesterday evening occupies 12 AM onwards rather than vanishing or reusing its
  // original start hour. `to - 1` keeps an event ending exactly at midnight off the 11 PM row.
  const byHour = new Map<number, typeof dayEvents>();
  for (const e of dayEvents) {
    if (e.allDayFlag) continue;
    const from = Math.max(e.startMs, dayStart.getTime());
    const to = Math.min(e.endMs, dayEnd.getTime());
    if (to <= from) continue;
    const first = new Date(from).getHours();
    const last = new Date(to - 1).getHours();
    for (let hour = first; hour <= last; hour++) {
      const bucket = byHour.get(hour);
      if (bucket) bucket.push(e);
      else byHour.set(hour, [e]);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-brand-gray px-4 py-3">
        <h3 className="font-semibold text-brand-dark">
          {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </h3>
      </div>

      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 bg-brand-gray/30 px-4 py-2">
          <div className="text-xs font-medium text-gray-600">All day</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {allDayEvents.map((e) => (
              // showTime: this lane has room, and it is the one place a deadline would
              // otherwise show without its due time. Real all-day events stay title-only.
              <EventChip key={e.id} event={e} showTime onClick={onEventClick} className="px-2 py-1 text-xs" />
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {hours.map((hour) => {
          const hourEvents = byHour.get(hour) ?? [];
          return (
            <div key={hour} className="flex min-h-12 bg-white">
              <button
                onClick={() => onTimeClick(hour)}
                aria-label={`Add event at ${hourLabel(hour)}`}
                className="w-20 shrink-0 border-r border-gray-100 px-3 py-2 text-left text-xs text-gray-500 hover:bg-brand-gray/40"
              >
                {hourLabel(hour)}
              </button>
              <div className="flex-1 space-y-1 p-1">
                {hourEvents.map((e) => (
                  <EventChip key={e.id} event={e} layout="row" onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
