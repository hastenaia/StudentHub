"use client";

import { CalendarDays, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EventSourceCounts } from "@/lib/scheduleView";

interface ScheduleFooterProps {
  counts: EventSourceCounts;
}

/** Source tally under the calendar, so it stays obvious which entries are editable. */
export function ScheduleFooter({ counts }: ScheduleFooterProps) {
  const { userCount, googleCount, taskCount } = counts;
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-center gap-4 py-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> {userCount} your events
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-gray-400" /> {googleCount} Google events (read-only)
        </span>
        {taskCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5 text-gray-400" /> {taskCount} task deadlines
          </span>
        )}
        <span className="ml-auto">Click a date or time slot to create an event.</span>
      </CardContent>
    </Card>
  );
}