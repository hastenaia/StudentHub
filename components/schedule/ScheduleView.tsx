"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { scheduleClientService } from "@/services/scheduleClient.service";
import { MonthView } from "@/components/schedule/MonthView";
import { WeekView } from "@/components/schedule/WeekView";
import { DayView } from "@/components/schedule/DayView";
import { AgendaView } from "@/components/schedule/AgendaView";
import { EventForm } from "@/components/schedule/EventForm";
import type { CalendarView, ScheduleCourseOption, ScheduleDraft, ScheduleEvent } from "@/types/schedule";
import { EVENT_TYPE_COLOR, EVENT_TYPE_LABEL } from "@/types/schedule";
import { formatDate, formatTime } from "@/utils/date";

interface ScheduleViewProps {
  initialEvents: ScheduleEvent[];
  courses: ScheduleCourseOption[];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const s = startOfWeek(date);
  return new Date(s.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function ScheduleView({ initialEvents, courses }: ScheduleViewProps) {
  const { toast } = useToast();
  const [events, setEvents] = React.useState<ScheduleEvent[]>(initialEvents);
  const [view, setView] = React.useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScheduleEvent | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>(undefined);
  const [detailEvent, setDetailEvent] = React.useState<ScheduleEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  const navigate = (dir: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const filtered = React.useMemo(() => {
    // For agenda, show all upcoming sorted; for others filter by view range
    if (view === "agenda") {
      return [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    let start: Date;
    let end: Date;
    if (view === "month") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      // Include overflow days for month view completeness
      const padStart = start.getDay();
      start = new Date(start.getTime() - padStart * 24 * 60 * 60 * 1000);
      end = new Date(end.getTime() + (6 - end.getDay()) * 24 * 60 * 60 * 1000);
    } else if (view === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    }
    return events.filter((e) => {
      const s = new Date(e.startAt).getTime();
      const ee = new Date(e.endAt).getTime();
      return s < end.getTime() && ee > start.getTime();
    });
  }, [events, view, currentDate]);

  const notify = (success: boolean, title: string, description?: string) => {
    toast({ title, description, variant: success ? "success" : "error" });
  };

  const handleCreate = async (draft: ScheduleDraft) => {
    const result = await scheduleClientService.createEvent(draft);
    if (result.success && result.data) {
      setEvents((prev) => [...prev, result.data as ScheduleEvent].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
      setFormOpen(false);
      setDefaultDate(undefined);
      notify(true, "Event created", result.message);
    } else {
      notify(false, "Couldn't create event", result.message);
    }
  };

  const handleUpdate = async (draft: ScheduleDraft) => {
    if (!editing) return;
    const result = await scheduleClientService.updateEvent(editing.id, draft);
    if (result.success && result.data) {
      setEvents((prev) => prev.map((e) => (e.id === editing.id ? (result.data as ScheduleEvent) : e)));
      setEditing(null);
      setFormOpen(false);
      setDetailEvent(null);
      notify(true, "Event updated", result.message);
    } else {
      notify(false, "Couldn't update event", result.message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    setDetailEvent(null);
    const result = await scheduleClientService.deleteEvent(id);
    if (result.success) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      notify(true, "Event deleted", result.message);
    } else {
      notify(false, "Couldn't delete event", result.message);
    }
  };

  const onEventClick = (event: ScheduleEvent) => {
    if (event.source === "google") {
      setDetailEvent(event);
    } else {
      setDetailEvent(event);
    }
  };

  const openCreate = (date?: Date | string) => {
    setEditing(null);
    if (date) {
      setDefaultDate(date instanceof Date ? date.toISOString() : date);
    } else {
      setDefaultDate(currentDate.toISOString());
    }
    setFormOpen(true);
  };

  const openEdit = (event: ScheduleEvent) => {
    if (event.source === "google") return;
    setEditing(event);
    setDetailEvent(null);
    setFormOpen(true);
  };

  const draftFromEvent = (event: ScheduleEvent | null): ScheduleDraft | null => {
    if (!event) return null;
    return {
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      eventType: event.eventType,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      color: event.color ?? "",
      courseId: event.courseId ?? "",
    };
  };

  const headerLabel = (() => {
    if (view === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(currentDate);
      const e = new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "day") return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return "Agenda";
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-brand-dark">{headerLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-200 bg-white p-1">
            {(["month", "week", "day", "agenda"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${
                  view === v ? "bg-brand-royal text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => openCreate()} size="sm">
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={filtered}
          onEventClick={onEventClick}
          onDateClick={(d) => {
            setCurrentDate(d);
            setView("day");
          }}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          events={filtered}
          onEventClick={onEventClick}
          onTimeClick={(date, hour) => {
            const d = new Date(date);
            d.setHours(hour, 0, 0, 0);
            openCreate(d);
          }}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          events={filtered}
          onEventClick={onEventClick}
          onTimeClick={(hour) => {
            const d = new Date(currentDate);
            d.setHours(hour, 0, 0, 0);
            openCreate(d);
          }}
        />
      )}
      {view === "agenda" && <AgendaView events={filtered} onEventClick={onEventClick} />}

      <EventForm
        open={formOpen}
        initialDraft={draftFromEvent(editing)}
        courses={courses}
        defaultDate={defaultDate}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setDefaultDate(undefined);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailEvent(null)}>
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-brand-dark">{detailEvent.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: detailEvent.color || EVENT_TYPE_COLOR[detailEvent.eventType] }}
                  >
                    {EVENT_TYPE_LABEL[detailEvent.eventType]}
                  </span>
                  {detailEvent.source === "google" ? (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Google • read-only</span>
                  ) : (
                    <span className="rounded bg-brand-gray px-2 py-0.5 text-xs text-gray-600">{detailEvent.courseName ?? "No course"}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailEvent(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">When</p>
                <p className="text-gray-700">
                  {detailEvent.allDay
                    ? `${formatDate(detailEvent.startAt)} (All day)`
                    : `${formatDate(detailEvent.startAt)} ${formatTime(detailEvent.startAt)} - ${formatTime(detailEvent.endAt)}`}
                </p>
              </div>
              {detailEvent.location && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="text-gray-700">{detailEvent.location}</p>
                </div>
              )}
              {detailEvent.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{detailEvent.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDetailEvent(null)}>
                Close
              </Button>
              {detailEvent.source === "user" ? (
                <>
                  <Button variant="outline" onClick={() => openEdit(detailEvent)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteConfirm(detailEvent.id)}>
                    Delete
                  </Button>
                </>
              ) : (
                <span className="px-3 py-2 text-xs text-gray-400">Google events are read-only via sync.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-brand-dark">Delete event?</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">This will permanently delete the event.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-4 py-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {events.filter((e) => e.source === "user").length} your events
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" /> {events.filter((e) => e.source === "google").length} Google events (read-only)
          </span>
          <span className="ml-auto">Click a date or time slot to create an event.</span>
        </CardContent>
      </Card>
    </div>
  );
}
