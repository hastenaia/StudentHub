"use client";

import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABEL } from "@/types/schedule";
import { eventTypeStyle } from "@/lib/scheduleView";
import type { ScheduleEvent } from "@/types/schedule";
import { dayKey } from "@/hooks/useGroupedEvents";
import { formatTime, formatDate } from "@/utils/date";

interface AgendaViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
}

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Math.round absorbs the ±1h a DST change introduces, so the label can't slip a day.
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso);
}

/**
 * A list rather than a grid, so it drops the filled chip for a bordered row with a coloured
 * left edge. Like every other view it lists a multi-day event once, on the day it starts.
 */
export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const grouped = new Map<string, { label: string; sortMs: number; items: ScheduleEvent[] }>();
  for (const e of events) {
    const startMs = Date.parse(e.startAt) || 0;
    const key = dayKey(new Date(startMs));
    const existing = grouped.get(key);
    if (existing) existing.items.push(e);
    else grouped.set(key, { label: toDateLabel(e.startAt), sortMs: startMs, items: [e] });
  }

  // Sort by timestamp, not by the day key: the key is unpadded, so "9-2" would sort after "9-10".
  const sorted = Array.from(grouped.entries())
    .map(([key, group]) => [key, group] as const)
    .sort(([, a], [, b]) => a.sortMs - b.sortMs);

  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      {sorted.map(([key, group]) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-brand-royal" aria-hidden />
              {group.label}
              <span className="text-xs font-normal text-gray-500">
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
                .sort((a, b) => (Date.parse(a.startAt) || 0) - (Date.parse(b.startAt) || 0))
                .map((e) => {
                  const chip = eventTypeStyle(e);
                  return (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 rounded-md border bg-white px-3 py-2.5 hover:bg-brand-gray/20"
                      style={{ borderLeftWidth: 4, borderLeftColor: chip.bg }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-brand-dark">{e.title}</p>
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: chip.bg, color: chip.fg, opacity: chip.opacity }}
                          >
                            {EVENT_TYPE_LABEL[e.eventType]}
                          </span>
                          {e.source === "google" && (
                            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                              <span aria-hidden>•</span> Google
                              <span className="sr-only"> (Google Calendar, read-only)</span>
                            </span>
                          )}
                        </div>
                        {e.description && <p className="truncate text-xs text-gray-500">{e.description}</p>}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>{e.allDay ? "All day" : `${formatTime(e.startAt)} - ${formatTime(e.endAt)}`}</span>
                          {e.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden /> {e.location}
                            </span>
                          )}
                          {e.courseName && <span className="rounded bg-brand-gray px-1.5 py-0.5 text-gray-600">{e.courseName}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEventClick(e)}>
                        View
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
