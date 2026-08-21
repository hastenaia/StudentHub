"use client";

import { cn } from "@/utils/cn";
import { EVENT_TYPE_COLOR } from "@/types/schedule";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";

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

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.startAt), day))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-8 border-b border-gray-200 bg-brand-gray/30">
        <div className="px-2 py-2 text-xs text-gray-400">Time</div>
        {days.map((d) => (
          <div key={d.toISOString()} className={cn("px-1 py-2 text-center", isToday(d) && "bg-brand-royal/5")}>
            <div className="text-xs font-medium text-gray-500">
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
              const hourEvents = eventsForDay(day).filter((e) => new Date(e.startAt).getHours() === hour);
              return (
                <button
                  key={day.toISOString() + hour}
                  onClick={() => onTimeClick(day, hour)}
                  className="min-h-[40px] border-r border-gray-100 p-1 text-left hover:bg-brand-gray/20"
                >
                  <div className="space-y-1">
                    {hourEvents.map((e) => (
                      <div
                        key={e.id}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onEventClick(e);
                        }}
                        className="truncate rounded px-1 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType], opacity: e.source === "google" ? 0.85 : 1 }}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {/* Show remaining events not in 7-18 range */}
        <div className="p-2">
          {days.map((day) => {
            const other = eventsForDay(day).filter((e) => {
              const h = new Date(e.startAt).getHours();
              return h < 7 || h >= 19;
            });
            if (other.length === 0) return null;
            return (
              <div key={day.toISOString()} className="mt-2">
                <div className="text-xs font-medium text-gray-500">
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — other times
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {other.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className="rounded px-2 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType] }}
                    >
                      {formatTime(e.startAt)} {e.title}
                    </button>
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
