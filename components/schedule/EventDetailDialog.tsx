"use client";

import { Button } from "@/components/ui/button";
import { eventTypeStyle } from "@/lib/scheduleView";
import { EVENT_TYPE_LABEL, type ScheduleEvent } from "@/types/schedule";
import { formatDate, formatTime } from "@/utils/date";

interface EventDetailDialogProps {
  event: ScheduleEvent;
  onClose: () => void;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}

/**
 * Read-only detail view for any entry the calendar shows. What it offers depends on
 * `event.source`: only `user` events are writable, since Google entries are replaced by
 * the next sync and task deadlines are derived from `tasks.due_at`.
 */
export function EventDetailDialog({ event, onClose, onEdit, onDelete }: EventDetailDialogProps) {
  const chip = eventTypeStyle(event);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-brand-dark">{event.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: chip.bg, color: chip.fg, opacity: chip.opacity }}
              >
                {EVENT_TYPE_LABEL[event.eventType]}
              </span>
              <SourceBadge event={event} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close details">
            ✕
          </Button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-500">{event.source === "task" ? "Due" : "When"}</p>
            <p className="text-gray-700">{whenText(event)}</p>
          </div>
          {event.location && (
            <div>
              <p className="text-xs font-medium text-gray-500">Location</p>
              <p className="text-gray-700">{event.location}</p>
            </div>
          )}
          {event.description && (
            <div>
              <p className="text-xs font-medium text-gray-500">Description</p>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {event.source === "user" ? (
            <>
              <Button variant="outline" onClick={() => onEdit(event)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => onDelete(event)}>
                Delete
              </Button>
            </>
          ) : (
            <span className="px-3 py-2 text-xs text-gray-400">{READ_ONLY_NOTE[event.source]}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const READ_ONLY_NOTE = {
  google: "Google events are read-only via sync.",
  task: "Due dates come from your Tasks — change them on the Tasks page.",
} as const;

/** A task deadline is flagged all-day, but the user set a clock time on the task, so show it. */
function whenText(event: ScheduleEvent): string {
  if (event.source === "task") return `${formatDate(event.startAt)} at ${formatTime(event.startAt)}`;
  return event.allDay
    ? `${formatDate(event.startAt)} (All day)`
    : `${formatDate(event.startAt)} ${formatTime(event.startAt)} - ${formatTime(event.endAt)}`;
}

function SourceBadge({ event }: { event: ScheduleEvent }) {
  if (event.source === "google") {
    return (
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        <span aria-hidden>•</span> Google
        <span className="sr-only"> (Google Calendar, read-only)</span>
      </span>
    );
  }
  if (event.source === "task") {
    return (
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        <span aria-hidden>•</span> Task due
        <span className="sr-only"> (from your Tasks, read-only here)</span>
      </span>
    );
  }
  return (
    <span className="rounded bg-brand-gray px-2 py-0.5 text-xs text-gray-600">
      {event.courseName ?? "No course"}
    </span>
  );
}