"use client";
import * as React from "react";
import { Clock, MapPin } from "lucide-react";
import { mockCalendarEvents, type MockCalEvent } from "@/lib/mocks/calendar";

const KIND_STYLE: Record<MockCalEvent["kind"], string> = {
  class: "bg-brand-royal text-white",
  exam: "bg-red-500 text-white",
  assignment: "bg-amber-500 text-white",
  personal: "bg-emerald-500 text-white",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" });
}

export function MonthView() {
  // 35 cells starting from last Sunday
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(today.getDate() - today.getDay());
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return d;
  });
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const eventsFor = (d: Date) => mockCalendarEvents.filter((e) => new Date(e.start).toDateString() === d.toDateString());

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
          <div key={w} className="bg-brand-gray px-2 py-2 text-center text-xs font-medium text-gray-600">{w}</div>
        ))}
        {cells.map((d, i) => {
          const evs = eventsFor(d);
          return (
            <div key={i} className={`min-h-[90px] bg-white p-1 ${isToday(d) ? "ring-2 ring-inset ring-brand-royal" : ""}`}>
              <p className={`text-xs ${isToday(d) ? "font-bold text-brand-royal" : "text-gray-500"}`}>{d.getDate()}</p>
              <div className="mt-1 space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <span key={e.id} className={`block truncate rounded px-1 py-0.5 text-[10px] leading-none ${KIND_STYLE[e.kind]}`}>{e.title}</span>
                ))}
                {evs.length > 3 && <span className="text-[10px] text-gray-400">+{evs.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekView() {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7am-18pm

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] text-xs">
        <div className="border-b bg-brand-gray p-2 text-gray-500"></div>
        {days.map((d) => (
          <div key={d.toISOString()} className="border-b border-l bg-brand-gray p-2 text-center font-medium text-brand-dark">{d.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" })}</div>
        ))}
        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="border-t p-1 text-gray-400">{h}:00</div>
            {days.map((d) => {
              const cellDate = new Date(d); cellDate.setHours(h,0,0,0);
              const ev = mockCalendarEvents.find((e) => {
                const s = new Date(e.start); return s.getDate()===cellDate.getDate() && s.getHours()===h;
              });
              return (
                <div key={d.toISOString()+h} className="relative border-l border-t p-0">
                  {ev && <span className={`absolute inset-1 flex items-center rounded px-1 text-[11px] leading-tight ${KIND_STYLE[ev.kind]}`}>{ev.title}</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function DayView() {
  const todayStr = new Date().toDateString();
  const todays = mockCalendarEvents.filter((e) => new Date(e.start).toDateString() === todayStr);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-brand-dark">{new Date().toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" })}</p>
      <div className="space-y-2">
        {todays.length === 0 && <p className="rounded-md border border-gray-100 bg-brand-gray/40 px-4 py-6 text-center text-sm text-gray-500">No events today</p>}
        {todays.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <span className={`h-10 w-1 rounded-full ${KIND_STYLE[e.kind]}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-dark">{e.title}</p>
              <p className="flex items-center gap-2 text-xs text-gray-500"><Clock className="h-3 w-3" /> {fmtTime(e.start)} — {fmtTime(e.end)} {e.location && <><MapPin className="h-3 w-3" /> {e.location}</>}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgendaView() {
  const grouped = new Map<string, MockCalEvent[]>();
  mockCalendarEvents.forEach((e) => {
    const key = new Date(e.start).toDateString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  });
  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, evs]) => (
        <div key={date}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{fmtDate(evs[0].start)}</p>
          <div className="space-y-1">
            {evs.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_STYLE[e.kind].replace("text-white","")}`} />
                <span className="text-sm text-brand-dark">{e.title}</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {fmtTime(e.start)}{e.course ? ` · ${e.course}` : ""}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
