"use client";

import { cn } from "@/utils/cn";
import { EVENT_TYPE_COLOR } from "@/types/schedule";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";

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

  const dayEvents = (date: Date) =>
    events
      .filter((e) => {
        const s = new Date(e.startAt);
        const eDate = new Date(e.endAt);
        // Include if event spans this day
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        return s < dayEnd && eDate > dayStart || isSameDay(s, date);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);

  const overflowCount = (date: Date) => {
    const count = events.filter((e) => isSameDay(new Date(e.startAt), date)).length;
    return count > 3 ? count - 3 : 0;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-brand-gray/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="min-h-[96px] border-b border-r border-gray-100 bg-gray-50/50" />;
          }
          const evs = dayEvents(date);
          const overflow = overflowCount(date);
          return (
            <button
              key={idx}
              onClick={() => onDateClick(date)}
              className={cn(
                "min-h-[96px] border-b border-r border-gray-100 p-1 text-left hover:bg-brand-gray/20",
                isToday(date) && "bg-brand-royal/5"
              )}
            >
              <div className={cn("text-xs font-medium", isToday(date) ? "text-brand-royal" : "text-gray-700")}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {evs.map((e) => (
                  <div
                    key={e.id}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onEventClick(e);
                    }}
                    className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType] || "#0033A0", opacity: e.source === "google" ? 0.85 : 1 }}
                    title={`${e.title} ${e.allDay ? "" : formatTime(e.startAt)}`}
                  >
                    {e.allDay ? "" : formatTime(e.startAt) + " "}
                    {e.title}
                    {e.source === "google" ? " •" : ""}
                  </div>
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
