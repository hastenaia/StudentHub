"use client";

import { cn } from "@/utils/cn";
import type { ScheduleEvent } from "@/types/schedule";
import * as React from "react";
import { dayKey, useGroupedEvents } from "@/hooks/useGroupedEvents";
import { EventChip } from "@/components/schedule/EventChip";

interface MonthViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onDateClick: (date: Date) => void;
}

const MAX_CHIPS = 3;

export function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay(); // 0 Sun

  // The grid always starts on the 1st and pads to whole weeks, so leading/trailing
  // days from the neighbouring months render as empty cells.
  const gridStart = new Date(year, month, 1 - startDay);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + cells.length - 1);

  // Multi-day events repeat across each day they touch, clamped to the cells we render.
  const { byDaySpan } = useGroupedEvents(events, { start: gridStart, end: gridEnd });

  const dayEvents = (date: Date) => (byDaySpan.get(dayKey(date)) ?? []).slice(0, MAX_CHIPS);
  const overflowCount = (date: Date) => {
    const total = byDaySpan.get(dayKey(date))?.length ?? 0;
    return total > MAX_CHIPS ? total - MAX_CHIPS : 0;
  };

  const todayKey = dayKey(new Date());

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
          const key = dayKey(date);
          const isToday = key === todayKey;
          const overflow = overflowCount(date);
          return (
            <button
              key={key}
              onClick={() => onDateClick(date)}
              aria-label={`${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${byDaySpan.get(key)?.length ?? 0} events`}
              className={cn(
                "min-h-[96px] bg-white p-1 text-left hover:bg-brand-gray/40",
                isToday && "ring-2 ring-inset ring-brand-royal"
              )}
            >
              <div className={cn("text-xs font-medium", isToday ? "font-bold text-brand-royal" : "text-gray-700")}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents(date).map((e) => (
                  <EventChip key={e.id} event={e} showTime onClick={onEventClick} />
                ))}
                {overflow > 0 && <div className="text-[11px] text-gray-400">+{overflow} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
