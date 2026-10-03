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
      not: () => chain,
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

const taskRow = {
  id: "k1",
  user_id: "u1",
  course_id: "c1",
  title: "Read chapter 4",
  description: null,
  status: "todo",
  priority: "medium",
  tags: [],
  due_at: "2026-09-14T12:00:00.000Z",
  estimate_minutes: 30,
  recurrence_freq: null,
  recurrence_interval: 1,
  recur_until: null,
  sort_order: 0,
  completed_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
};

beforeEach(() => {
  clientRef.current = stubClient({
    schedule_events: [scheduleRow],
    calendar_events: [calendarRow],
    courses: [{ id: "c1", name: "Chem 101", course_name: "Chemistry", color: "#00f" }],
    profiles: [{ default_calendar_view: "week" }],
    tasks: [],
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
    clientRef.current = stubClient({
      schedule_events: [],
      calendar_events: [],
      courses: [],
      profiles: [],
      tasks: [],
    });
    const data = await getScheduleData("u1");
    expect(data.events).toEqual([]);
    expect(data.courses).toEqual([]);
    expect(data.taskEvents).toEqual([]);
    expect(data.defaultView).toBe("month");
  });
});

describe("getScheduleData task deadlines", () => {
  beforeEach(() => {
    clientRef.current = stubClient({
      schedule_events: [scheduleRow],
      calendar_events: [calendarRow],
      courses: [{ id: "c1", name: "Chem 101", course_name: "Chemistry", color: "#00f" }],
      profiles: [{ default_calendar_view: "week" }],
      tasks: [taskRow],
    });
  });

  it("derives an all-day deadline chip from a task due date", async () => {
    const [deadline] = (await getScheduleData("u1")).taskEvents;
    expect(deadline).toMatchObject({
      id: "task:k1",
      title: "Read chapter 4",
      eventType: "assignment",
      allDay: true,
      source: "task",
      courseName: "Chemistry",
    });
  });

  it("merges deadlines into the main event list in start order", async () => {
    const { events } = await getScheduleData("u1");
    // task due 09-14, schedule event 09-15, Google event 09-16.
    expect(events.map((e) => e.id)).toEqual(["task:k1", "e1", "g1"]);
  });

  it("leaves the stored event lists untouched by derived deadlines", async () => {
    const data = await getScheduleData("u1");
    expect(data.userEvents.map((e) => e.id)).toEqual(["e1"]);
    expect(data.googleEvents.map((e) => e.id)).toEqual(["g1"]);
  });

  it("drops a completed task's deadline", async () => {
    clientRef.current = stubClient({
      schedule_events: [],
      calendar_events: [],
      courses: [],
      profiles: [],
      tasks: [{ ...taskRow, status: "done", completed_at: "2026-09-13T00:00:00.000Z" }],
    });
    const data = await getScheduleData("u1");
    expect(data.taskEvents).toEqual([]);
    expect(data.events).toEqual([]);
  });

  it("drops an in-window task that has no due date", async () => {
    clientRef.current = stubClient({
      schedule_events: [],
      calendar_events: [],
      courses: [],
      profiles: [],
      tasks: [{ ...taskRow, due_at: null }],
    });
    expect((await getScheduleData("u1")).taskEvents).toEqual([]);
  });

  it("shows a deadline alongside real events without displacing them", async () => {
    const { events } = await getScheduleData("u1");
    expect(events.filter((e) => e.source === "task")).toHaveLength(1);
    expect(events.filter((e) => e.source === "user")).toHaveLength(1);
    expect(events.filter((e) => e.source === "google")).toHaveLength(1);
  });
});
