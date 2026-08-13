import { CalendarClock, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarEvent, DashboardAssignment } from "@/types/academics";
import { formatTime, formatDueLabel } from "@/utils/date";

interface TodayOverviewProps {
  events: CalendarEvent[];
  upcoming: DashboardAssignment[];
}

/**
 * "Today's overview" panel: today's calendar events from Google Calendar plus
 * the nearest upcoming assignment deadlines. Renders empty states rather than
 * nothing so the grid stays balanced.
 */
export function TodayOverview({ events, upcoming }: TodayOverviewProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-brand-royal" /> Today&apos;s overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-brand-gray/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-brand-dark">{event.summary}</p>
                  {event.location && (
                    <p className="text-xs text-gray-500">{event.location}</p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-brand-royal">
                  {event.allDay ? "All day" : formatTime(event.startAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No calendar events in the next few days.</p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-brand-dark text-gray-500">
            Upcoming assignments
          </p>
          {upcoming.length > 0 ? (
            <ul className="space-y-2">
              {upcoming.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-gray-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-dark">
                      {assignment.title}
                    </p>
                    <p className="truncate text-xs text-gray-500">{assignment.courseName}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-royal">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDueLabel(assignment.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nothing due soon — enjoy the calm.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}