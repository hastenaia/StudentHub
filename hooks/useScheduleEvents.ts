"use client";

import * as React from "react";
import { useToast } from "@/hooks/useToast";
import { scheduleClientService } from "@/services/scheduleClient.service";
import type { ScheduleDraft, ScheduleEvent } from "@/types/schedule";

const byStart = (a: ScheduleEvent, b: ScheduleEvent) => Date.parse(a.startAt) - Date.parse(b.startAt);

/**
 * Owns the calendar's event list and its three mutations. Each mutation applies an optimistic
 * update and reports the outcome through a toast, returning `true` when it succeeded so the
 * caller can close whatever dialog triggered it. Google events and task deadlines are read-only
 * and never route through here — the service layer rejects them.
 */
export function useScheduleEvents(initialEvents: readonly ScheduleEvent[]) {
  const { notify } = useToast();
  const [events, setEvents] = React.useState<ScheduleEvent[]>([...initialEvents]);

  async function createEvent(draft: ScheduleDraft): Promise<boolean> {
    const result = await scheduleClientService.createEvent(draft);
    if (result.success && result.data) {
      setEvents((prev) => [...prev, result.data as ScheduleEvent].sort(byStart));
      notify(true, "Event created", result.message);
      return true;
    }
    notify(false, "Couldn't create event", result.message);
    return false;
  }

  async function updateEvent(id: string, draft: ScheduleDraft): Promise<boolean> {
    const result = await scheduleClientService.updateEvent(id, draft);
    if (result.success && result.data) {
      setEvents((prev) => prev.map((e) => (e.id === id ? (result.data as ScheduleEvent) : e)));
      notify(true, "Event updated", result.message);
      return true;
    }
    notify(false, "Couldn't update event", result.message);
    return false;
  }

  async function deleteEvent(id: string): Promise<boolean> {
    const result = await scheduleClientService.deleteEvent(id);
    if (result.success) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      notify(true, "Event deleted", result.message);
      return true;
    }
    notify(false, "Couldn't delete event", result.message);
    return false;
  }

  return { events, createEvent, updateEvent, deleteEvent };
}