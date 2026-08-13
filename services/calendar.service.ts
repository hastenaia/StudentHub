import { googleFetch } from "@/lib/google/tokens";
import type { GoogleCalendarEvent } from "@/types/google";

/**
 * Thin client for the Google Calendar API. Returns raw events for a time
 * window; the sync service keeps the window a rolling ±N days so the cached
 * snapshot stays useful without hammering the API.
 */

const CALENDAR_ROOT = "https://www.googleapis.com/calendar/v3";

export interface CalendarWindow {
  timeMin: string;
  timeMax: string;
}

export function buildWindow(
  now: Date,
  daysPast = 7,
  daysFuture = 21
): CalendarWindow {
  const min = new Date(now.getTime() - daysPast * 24 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + daysFuture * 24 * 60 * 60 * 1000);
  return {
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
  };
}

/** Events from the linked primary calendar within [timeMin, timeMax]. */
export async function listEvents(
  accessToken: string,
  window: CalendarWindow
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      singleEvents: "true", // expand recurring events
      orderBy: "startTime", // requires singleEvents=true
      timeMin: window.timeMin,
      timeMax: window.timeMax,
      maxResults: "250", // hard cap to keep responses small
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);

    const page = await googleFetch<{ items?: GoogleCalendarEvent[]; nextPageToken?: string }>(
      `${CALENDAR_ROOT}/calendars/primary/events?${params.toString()}`,
      accessToken
    );

    events.push(...(page.items ?? []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken);

  return events;
}