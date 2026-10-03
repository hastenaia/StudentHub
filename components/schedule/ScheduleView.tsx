"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFilteredEvents } from "@/hooks/useFilteredEvents";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useScheduleDialogs } from "@/hooks/useScheduleDialogs";
import { EventEmptyState } from "@/components/schedule/EventEmptyState";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ScheduleCalendarView } from "@/components/schedule/ScheduleCalendarView";
import { ScheduleFooter } from "@/components/schedule/ScheduleFooter";
import { ScheduleDialogs } from "@/components/schedule/ScheduleDialogs";
import { countEventSources, stepPeriod } from "@/lib/scheduleView";
import type { CalendarView, ScheduleCourseOption, ScheduleDraft, ScheduleEvent } from "@/types/schedule";

interface ScheduleViewProps {
  initialEvents: ScheduleEvent[];
  courses: ScheduleCourseOption[];
  /** The user's saved `default_calendar_view`, read server-side to keep SSR and first paint in step. */
  initialView?: CalendarView;
}

function draftFromEvent(event: ScheduleEvent | null): ScheduleDraft | null {
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
}

/**
 * Wires the schedule screen together. State lives in `useScheduleEvents`/`useScheduleDialogs`
 * and presentation in the child components. Only `user` events are writable — Google entries
 * are replaced by the next sync and task deadlines are derived from `tasks.due_at`.
 */
export function ScheduleView({ initialEvents, courses, initialView }: ScheduleViewProps) {
  const [view, setView] = React.useState<CalendarView>(initialView ?? "month");
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());

  const { events, createEvent, updateEvent, deleteEvent } = useScheduleEvents(initialEvents);
  const dialogs = useScheduleDialogs(currentDate);
  const filtered = useFilteredEvents(events, view, currentDate);
  const counts = React.useMemo(() => countEventSources(events), [events]);

  const handleSubmit = async (draft: ScheduleDraft) => {
    const id = dialogs.editing?.id;
    const ok = id ? await updateEvent(id, draft) : await createEvent(draft);
    if (ok) dialogs.dismissAll();
  };

  const handleConfirmDelete = async (event: ScheduleEvent) => {
    dialogs.cancelDelete();
    dialogs.closeDetail();
    await deleteEvent(event.id);
  };

  const openCreateAt = (date: Date, hour: number) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    dialogs.openCreate(d);
  };

  return (
    <div className="space-y-4">
      <Card>
        <ScheduleToolbar
          view={view}
          currentDate={currentDate}
          onViewChange={setView}
          onToday={() => setCurrentDate(new Date())}
          onStep={(direction) => setCurrentDate((prev) => stepPeriod(view, prev, direction))}
          onNewEvent={() => dialogs.openCreate()}
        />

        <CardContent>
          <div className={filtered.length === 0 ? "mb-4" : undefined}>
            {filtered.length === 0 && <EventEmptyState view={view} onCreate={() => dialogs.openCreate()} />}
          </div>

          <ScheduleCalendarView
            view={view}
            currentDate={currentDate}
            events={filtered}
            onEventClick={dialogs.openDetail}
            onDateClick={(d) => {
              setCurrentDate(d);
              setView("day");
            }}
            onCreateAt={openCreateAt}
          />
        </CardContent>
      </Card>

      <ScheduleDialogs
        courses={courses}
        formOpen={dialogs.formOpen}
        draft={draftFromEvent(dialogs.editing)}
        defaultDate={dialogs.defaultDate}
        onSubmit={handleSubmit}
        onCloseForm={dialogs.closeForm}
        detail={dialogs.detailEvent}
        onCloseDetail={dialogs.closeDetail}
        onEdit={dialogs.openEdit}
        onRequestDelete={dialogs.requestDelete}
        deleteEvent={dialogs.deleteEvent}
        onCancelDelete={dialogs.cancelDelete}
        onConfirmDelete={handleConfirmDelete}
      />

      <ScheduleFooter counts={counts} />
    </div>
  );
}