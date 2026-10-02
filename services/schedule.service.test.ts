// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientRef } = vi.hoisted(() => ({ clientRef: { current: null as unknown } }));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => clientRef.current }));

import { getScheduleData } from "./schedule.service";

type Rows = Record<string, Record<string, unknown>[]>;

/** Minimal chainable stand-in for the Supabase query builder: every filter returns `this`. */
function stubClient(rows: Rows) {
  function builder(table: string) {
    const data = rows[table] ?? [];
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: data[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(resolve, reject),
    };
    return chain;
  }
  return { from: (table: string) => builder(table) };
}

const scheduleRow = {
  id: "e1",
  user_id: "u1",
  course_id: null,
  title: "Lab Report due",
  description: null,
  location: null,
  event_type: "assignment",
  start_at: "2026-09-15T09:00:00.000Z",
  end_at: "2026-09-15T10:00:00.000Z",
  all_day: false,
  color: null,
};

const calendarRow = {
  id: "g1",
  user_id: "u1",
  google_event_id: "gid",
  summary: "Organic Chemistry Midterm",
  description: null,
  location: "Hall B",
  start_at: "2026-09-16T09:00:00.000Z",
  end_at: "2026-09-16T11:00:00.000Z",
  all_day: false,
};

beforeEach(() => {
  clientRef.current = stubClient({
    schedule_events: [scheduleRow],
    calendar_events: [calendarRow],
    courses: [{ id: "c1", name: "Chem 101", course_name: "Chemistry", color: "#00f" }],
    profiles: [{ default_calendar_view: "week" }],
  });
});

describe("getScheduleData", () => {
  it("merges user and Google rows into one start-ordered list", async () => {
    const data = await getScheduleData("u1");
    expect(data.events.map((e) => e.id)).toEqual(["e1", "g1"]);
    expect(data.userEvents[0].source).toBe("user");
    expect(data.googleEvents[0].source).toBe("google");
  });

  it("infers a type for Google rows and keeps the stored type for user rows", async () => {
    const data = await getScheduleData("u1");
    expect(data.googleEvents[0].eventType).toBe("exam");
    expect(data.userEvents[0].eventType).toBe("assignment");
  });

  it("resolves the course options for the form", async () => {
    const data = await getScheduleData("u1");
    expect(data.courses).toEqual([{ id: "c1", name: "Chemistry", color: "#00f" }]);
  });

  it("honours the saved default_calendar_view", async () => {
    expect((await getScheduleData("u1")).defaultView).toBe("week");
  });

  it.each([
    ["a missing profile row", []],
    ["an unrecognised value", [{ default_calendar_view: "year" }]],
  ])("falls back to month for %s", async (_label, profiles) => {
    clientRef.current = stubClient({
      schedule_events: [],
      calendar_events: [],
      courses: [],
      profiles,
    });
    expect((await getScheduleData("u1")).defaultView).toBe("month");
  });

  it("returns empty collections instead of throwing when every table is empty", async () => {
    clientRef.current = stubClient({ schedule_events: [], calendar_events: [], courses: [], profiles: [] });
    const data = await getScheduleData("u1");
    expect(data.events).toEqual([]);
    expect(data.courses).toEqual([]);
    expect(data.defaultView).toBe("month");
  });
});
