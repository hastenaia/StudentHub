"use client";

import { MonthView } from "@/components/schedule/MonthView";
import { WeekView } from "@/components/schedule/WeekView";
import { DayView } from "@/components/schedule/DayView";
import { AgendaView } from "@/components/schedule/AgendaView";
import type { CalendarView, ScheduleEvent } from "@/types/schedule";

interface ScheduleCalendarViewProps {
  view: CalendarView;
  currentDate: Date;
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onDateClick: (date: Date) => void;
  onCreateAt: (date: Date, hour: number) => void;
}

/** Picks the calendar body for the active view. Exactly one is ever mounted. */
export function ScheduleCalendarView(props: ScheduleCalendarViewProps) {
  const { view, currentDate, events, onEventClick, onDateClick, onCreateAt } = props;
  if (view === "month") {
    return <MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} onDateClick={onDateClick} />;
  }
  if (view === "week") {
    return (
      <WeekView
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
        onTimeClick={(date, hour) => onCreateAt(date, hour)}
      />
    );
  }
  if (view === "day") {
    return (
      <DayView
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
        onTimeClick={(hour) => onCreateAt(currentDate, hour)}
      />
    );
  }
  return <AgendaView events={events} onEventClick={onEventClick} />;
}