import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarView } from "@/types/schedule";

const COPY: Record<CalendarView, string> = {
  month: "No events this month.",
  week: "No events this week — click a time slot or create one.",
  day: "No events this day — click a time slot or create one.",
  agenda: "No events in this period.",
};

interface EventEmptyStateProps {
  view: CalendarView;
  onCreate: () => void;
}

/** One empty state for all four views, so switching views never changes the pattern. */
export function EventEmptyState({ view, onCreate }: EventEmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-gray-200 bg-brand-gray/30 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        {COPY[view]}
      </span>
      <Button onClick={onCreate} size="sm" variant="outline">
        <Plus className="h-4 w-4" aria-hidden /> New event
      </Button>
    </div>
  );
}
