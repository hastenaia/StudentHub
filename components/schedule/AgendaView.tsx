"use client";

import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_COLOR, EVENT_TYPE_LABEL } from "@/types/schedule";
import type { ScheduleEvent } from "@/types/schedule";
import { formatTime, formatDate } from "@/utils/date";

interface AgendaViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso);
}

export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const grouped = new Map<string, { label: string; items: ScheduleEvent[] }>();
  for (const e of events) {
    const key = toDateKey(e.startAt);
    const label = toDateLabel(e.startAt);
    const existing = grouped.get(key);
    if (existing) existing.items.push(e);
    else grouped.set(key, { label, items: [e] });
  }

  const sorted = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-gray-500">No events in this period.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map(([key, group]) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-brand-royal" />
              {group.label}
              <span className="text-xs font-normal text-gray-400">
                {new Date(group.items[0].startAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {group.items
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-md border px-3 py-2.5 hover:bg-brand-gray/20"
                    style={{ borderLeftWidth: 4, borderLeftColor: e.color || EVENT_TYPE_COLOR[e.eventType] }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-brand-dark">{e.title}</p>
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                          style={{ backgroundColor: e.color || EVENT_TYPE_COLOR[e.eventType] }}
                        >
                          {EVENT_TYPE_LABEL[e.eventType]}
                        </span>
                        {e.source === "google" && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">Google</span>
                        )}
                      </div>
                      {e.description && <p className="truncate text-xs text-gray-500">{e.description}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>{e.allDay ? "All day" : `${formatTime(e.startAt)} - ${formatTime(e.endAt)}`}</span>
                        {e.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </span>
                        )}
                        {e.courseName && <span className="rounded bg-brand-gray px-1.5 py-0.5 text-gray-600">{e.courseName}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onEventClick(e)}>
                      View
                    </Button>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
