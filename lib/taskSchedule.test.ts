import { describe, expect, it } from "vitest";

import { isTaskEventId, taskEventId, tasksToScheduleEvents } from "./taskSchedule";
import type { Task } from "@/types/tasks";

/**
 * Does this runner's zone actually observe DST? Only then can a naive `+86400000` be
 * told apart from calendar-day stepping — on a zone without DST both yield midnight, so
 * the DST cases below skip rather than pass vacuously. `vitest` workers ignore a
 * `process.env.TZ` assigned at module scope, so the zone can't be forced from here.
 *
 * Probed from the day *after* the 2026-03-08 spring-forward: adding 24h to that day's
 * midnight crosses the 2am transition and lands on 01:00 only where DST is observed.
 */
const ZONE_HAS_DST = new Date(new Date(2026, 2, 8).getTime() + 86400000).getHours() !== 0;
const itDST = ZONE_HAS_DST ? it : it.skip;

function task(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Lab report",
    description: null,
    status: "todo",
    priority: "medium",
    tags: [],
    dueAt: "2026-09-15T17:00:00.000Z",
    estimateMinutes: null,
    recurrenceFreq: null,
    recurrenceInterval: 1,
    recurrenceDays: [],
    recurUntil: null,
    courseId: null,
    courseName: null,
    courseColor: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

describe("taskEventId", () => {
  it("namespaces the id so it can never collide with an event uuid", () => {
    expect(taskEventId("abc")).toBe("task:abc");
  });

  it("recognises its own ids and nothing else", () => {
    expect(isTaskEventId("task:abc")).toBe(true);
    expect(isTaskEventId("3f1b2c4d-0000-0000-0000-000000000000")).toBe(false);
  });
});

describe("tasksToScheduleEvents", () => {
  it("reports whether this runner's zone can verify DST stepping", () => {
    // Not an assertion about the code — it documents why the two DST cases may skip.
    expect(typeof ZONE_HAS_DST).toBe("boolean");
  });

  it("turns a due date into one all-day assignment deadline", () => {
    const [ev] = tasksToScheduleEvents([task()]);
    expect(ev).toMatchObject({
      title: "Lab report",
      eventType: "assignment",
      allDay: true,
      source: "task",
      color: null,
      location: null,
    });
  });

  it("uses a namespaced id", () => {
    expect(tasksToScheduleEvents([task()])[0].id).toBe("task:t1");
  });

  it("keeps the exact instant the user chose rather than snapping to midnight", () => {
    const due = "2026-09-15T17:00:00.000Z";
    const [ev] = tasksToScheduleEvents([task({ dueAt: due })]);
    expect(ev.startAt).toBe(new Date(due).toISOString());
  });

  it("touches exactly the one local day the due date falls on", () => {
    const [ev] = tasksToScheduleEvents([task({ dueAt: "2026-09-15T17:00:00.000Z" })]);
    expect(local(ev.startAt)).toEqual(local("2026-09-15T17:00:00.000Z"));
    expect(local(ev.endAt)).toEqual(local("2026-09-16T17:00:00.000Z"));
  });

  it("buckets under the due date even for a late-evening deadline", () => {
    // 23:30 local must not spill the chip onto the following day.
    const [ev] = tasksToScheduleEvents([task({ dueAt: new Date(2026, 8, 15, 23, 30).toISOString() })]);
    expect(local(ev.startAt).getDate()).toBe(15);
    expect(local(ev.endAt).getDate()).toBe(16);
  });

  it("keeps endAt strictly after startAt", () => {
    for (const hour of [0, 1, 12, 23, 59]) {
      const [ev] = tasksToScheduleEvents([task({ dueAt: new Date(2026, 8, 15, hour).toISOString() })]);
      expect(Date.parse(ev.endAt)).toBeGreaterThan(Date.parse(ev.startAt));
    }
  });

  it("keeps the end within a day of the start", () => {
    const [ev] = tasksToScheduleEvents([task()]);
    const hours = (Date.parse(ev.endAt) - Date.parse(ev.startAt)) / 3600000;
    expect(hours).toBeGreaterThan(0);
    expect(hours).toBeLessThanOrEqual(24);
  });

  itDST("steps to the next local midnight across a spring-forward DST change", () => {
    // US zones spring forward at 02:00 on 2026-03-08, so that day's midnight is still
    // EST and the following one is EDT: real calendar-day stepping gives a 23-hour span,
    // while a naive +24h would land on 01:00 local instead of midnight. Assert on the raw
    // instant — `local()` truncates to midnight, so its getHours() is always 0.
    const [ev] = tasksToScheduleEvents([task({ dueAt: "2026-03-08T20:00:00.000Z" })]);
    const end = new Date(ev.endAt);
    expect(end.getHours()).toBe(0);
    expect(end.getDate()).toBe(9);
    expect(end.getMonth()).toBe(2);
  });

  itDST("keeps the end at next local midnight across a fall-back DST change", () => {
    // Clocks fall back at 02:00 on 2026-11-01, so the next midnight is a 25-hour span;
    // a naive +24h would land on 23:00 the same day.
    const [ev] = tasksToScheduleEvents([task({ dueAt: "2026-11-01T20:00:00.000Z" })]);
    const end = new Date(ev.endAt);
    expect(end.getHours()).toBe(0);
    expect(end.getDate()).toBe(2);
    expect(end.getMonth()).toBe(10);
  });

  it("rolls a month boundary correctly", () => {
    const [ev] = tasksToScheduleEvents([task({ dueAt: "2026-09-30T12:00:00.000Z" })]);
    expect(local(ev.endAt).getMonth()).toBe(9);
    expect(local(ev.endAt).getDate()).toBe(1);
  });

  it("skips tasks with no due date", () => {
    expect(tasksToScheduleEvents([task({ dueAt: null })])).toEqual([]);
  });

  it("skips completed tasks", () => {
    expect(tasksToScheduleEvents([task({ status: "done" })])).toEqual([]);
  });

  it("keeps in-progress tasks", () => {
    expect(tasksToScheduleEvents([task({ status: "in_progress" })])).toHaveLength(1);
  });

  it("skips an unparseable due date instead of emitting an invalid event", () => {
    expect(tasksToScheduleEvents([task({ dueAt: "not-a-date" })])).toEqual([]);
  });

  it("carries the course through for display", () => {
    const [ev] = tasksToScheduleEvents([
      task({ courseId: "c1", courseName: "Chemistry", courseColor: "#123456" }),
    ]);
    expect(ev).toMatchObject({ courseId: "c1", courseName: "Chemistry", courseColor: "#123456" });
  });

  it("leaves color null so the chip keeps the assignment colour", () => {
    const [ev] = tasksToScheduleEvents([task({ courseColor: "#123456" })]);
    expect(ev.color).toBeNull();
  });

  it("carries the description and clears fields a task has no equivalent for", () => {
    const [ev] = tasksToScheduleEvents([task({ description: "Chapter 4 problems" })]);
    expect(ev.description).toBe("Chapter 4 problems");
    expect(ev.googleEventId).toBeNull();
  });

  it("maps every eligible task and preserves input order", () => {
    const events = tasksToScheduleEvents([
      task({ id: "a", dueAt: "2026-09-20T12:00:00.000Z" }),
      task({ id: "b", dueAt: null }),
      task({ id: "c", dueAt: "2026-09-10T12:00:00.000Z" }),
    ]);
    expect(events.map((e) => e.id)).toEqual(["task:a", "task:c"]);
  });

  it("returns an empty list for no tasks", () => {
    expect(tasksToScheduleEvents([])).toEqual([]);
  });
});