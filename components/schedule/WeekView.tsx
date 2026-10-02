"use client";

import { cn } from "@/utils/cn";
import { eventTypeStyle } from "@/lib/scheduleView";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";
import { dayKey, useGroupedEvents } from "@/hooks/useGroupedEvents";

interface WeekViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onTimeClick: (date: Date, hour: number) => void;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function WeekView({ currentDate, events, onEventClick, onTimeClick }: WeekViewProps) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7am - 6pm, simplified
  const { byDay, byDayHour } = useGroupedEvents(events);

  const eventsForDay = (day: Date) => byDay.get(dayKey(day)) ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-8 border-b border-gray-200 bg-brand-gray">
        <div className="px-2 py-2 text-xs font-medium text-gray-600">Time</div>
        {days.map((d) => (
          <div key={d.toISOString()} className={cn("border-l border-gray-200 px-1 py-2 text-center", isToday(d) && "bg-brand-royal/10")}>
            <div className="text-xs font-medium text-gray-600">
              {d.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div className={cn("text-sm font-semibold", isToday(d) ? "text-brand-royal" : "text-gray-700")}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="max-h-[480px] overflow-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
            <div className="border-r border-gray-100 px-2 py-2 text-xs text-gray-400">
              {hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
            </div>
            {days.map((day) => {
              const hourEvents = (byDayHour.get(`${dayKey(day)}:${hour}`) ?? []);
              return (
                <button
                  key={day.toISOString() + hour}
                  onClick={() => onTimeClick(day, hour)}
                  className="min-h-[40px] border-r border-gray-100 bg-white p-1 text-left hover:bg-brand-gray/40"
                >
                  <div className="space-y-1">
                    {hourEvents.map((e) => {
                      const chip = eventTypeStyle(e);
                      return (
                        <div
                          key={e.id}
                          onClick={(evt) => {
                            evt.stopPropagation();
                            onEventClick(e);
                          }}
                          className="truncate rounded px-1 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: chip.bg, color: chip.fg, opacity: chip.opacity }}
                        >
                          {e.title}
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {/* Show remaining events not in 7-18 range */}
        <div className="bg-white p-2">
          {days.map((day) => {
            const other = eventsForDay(day).filter((e) => e.hour < 7 || e.hour >= 19);
            if (other.length === 0) return null;
            return (
              <div key={day.toISOString()} className="mt-2">
                <div className="text-xs font-medium text-gray-500">
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — other times
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {other.map((e) => {
                    const chip = eventTypeStyle(e);
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEventClick(e)}
                        className="rounded px-2 py-1 text-xs font-medium"
                        style={{ backgroundColor: chip.bg, color: chip.fg, opacity: chip.opacity }}
                      >
                        {formatTime(e.startAt)} {e.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
