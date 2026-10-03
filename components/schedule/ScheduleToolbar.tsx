"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { viewHeaderLabel } from "@/lib/scheduleView";
import { CALENDAR_VIEWS, EVENT_TYPE_COLOR, EVENT_TYPE_LABEL, SCHEDULE_EVENT_TYPES, type CalendarView } from "@/types/schedule";

interface ScheduleToolbarProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onStep: (direction: 1 | -1) => void;
  onNewEvent: () => void;
}

export function ScheduleToolbar({
  view,
  currentDate,
  onViewChange,
  onToday,
  onStep,
  onNewEvent,
}: ScheduleToolbarProps) {
  return (
    <CardHeader className="pb-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onStep(-1)} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onStep(1)} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-brand-dark">{viewHeaderLabel(view, currentDate)}</h2>
        </div>
        <Button onClick={onNewEvent} size="sm">
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {CALENDAR_VIEWS.map((v) => (
          <Button key={v} size="sm" variant={v === view ? "default" : "outline"} onClick={() => onViewChange(v)} className="capitalize">
            {v}
          </Button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {SCHEDULE_EVENT_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLOR[t] }} aria-hidden />
              {EVENT_TYPE_LABEL[t]}
            </span>
          ))}
        </span>
      </div>
    </CardHeader>
  );
}