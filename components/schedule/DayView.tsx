"use client";

import { EVENT_TYPE_COLOR } from "@/types/schedule";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime } from "@/utils/date";

interface DayViewProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onTimeClick: (hour: number) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DayView({ currentDate, events, onEventClick, onTimeClick }: DayViewProps) {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.startAt), currentDate))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-brand-gray/30 px-4 py-3">
        <h3 className="font-semibold text-brand-dark">
          {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((e) => new Date(e.startAt).getHours() === hour && !e.allDay);
          const label = hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
          return (
            <div key={hour} className="flex min-h-[48px]">
              <button
                onClick={() => onTimeClick(hour)}
                className="w-20 shrink-0 border-r border-gray-100 px-3 py-2 text-left text-xs text-gray-400 hover:bg-brand-gray/20"
              >
                {label}
              </button>
              <div className="flex-1 p-1">
                {hourEvents.length > 0 ? (
                  <div className="space-y-1">
                    {hourEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onEventClick(e)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm font-medium text-white"
                        style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType], opacity: e.source === "google" ? 0.9 : 1 }}
                      >
                        <span className="truncate">{e.title}</span>
                        <span className="ml-auto shrink-0 text-xs opacity-80">
                          {formatTime(e.startAt)} - {formatTime(e.endAt)}
                        </span>
                        {e.source === "google" && <span className="text-[10px] opacity-70">• Google</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </div>
          );
        })}
        {dayEvents.filter((e) => e.allDay).length > 0 && (
          <div className="bg-amber-50 p-3">
            <div className="text-xs font-medium text-amber-700">All day</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {dayEvents
                .filter((e) => e.allDay)
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className="rounded px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType] }}
                  >
                    {e.title}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
