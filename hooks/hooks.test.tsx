import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { dayKey, useGroupedEvents } from "./useGroupedEvents";
import { useEscapeKey } from "./useEscapeKey";
import type { ScheduleEvent } from "@/types/schedule";

const event = (id: string, startAt: string, endAt: string, over: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  courseId: null,
  courseName: null,
  courseColor: null,
  title: id,
  description: null,
  location: null,
  eventType: "class",
  startAt,
  endAt,
  allDay: false,
  color: null,
  source: "user",
  ...over,
});

describe("useGroupedEvents", () => {
  it("buckets events by local day and day+hour, sorted by start", () => {
    const late = event("late", new Date(2026, 8, 15, 14).toISOString(), new Date(2026, 8, 15, 15).toISOString());
    const early = event("early", new Date(2026, 8, 15, 9).toISOString(), new Date(2026, 8, 15, 10).toISOString());
    const other = event("other", new Date(2026, 8, 16, 9).toISOString(), new Date(2026, 8, 16, 10).toISOString());
    const { result } = renderHook(() => useGroupedEvents([late, early, other]));

    const key = dayKey(new Date(2026, 8, 15));
    expect(result.current.byDay.get(key)?.map((e) => e.id)).toEqual(["early", "late"]);
    expect(result.current.byDayHour.get(`${key}:9`)?.map((e) => e.id)).toEqual(["early"]);
    expect(result.current.byDay.get(dayKey(new Date(2026, 8, 16)))?.map((e) => e.id)).toEqual(["other"]);
  });

  it("tolerates unparseable timestamps (start → 0, end → start)", () => {
    const { result } = renderHook(() => useGroupedEvents([event("bad", "nope", "also nope")]));
    expect(result.current.decorated[0]).toMatchObject({ startMs: 0, endMs: 0 });
  });

  it("recomputes only when the events array changes", () => {
    const events = [event("a", new Date(2026, 8, 15, 9).toISOString(), new Date(2026, 8, 15, 10).toISOString())];
    const { result, rerender } = renderHook(({ list }) => useGroupedEvents(list), { initialProps: { list: events } });
    const first = result.current;
    rerender({ list: events });
    expect(result.current).toBe(first);
  });

  it("byDay lists a multi-day event once, on its start day", () => {
    const span = event("span", new Date(2026, 8, 15, 22).toISOString(), new Date(2026, 8, 17, 2).toISOString());
    const { result } = renderHook(() => useGroupedEvents([span]));
    expect(result.current.byDay.get(dayKey(new Date(2026, 8, 15)))?.map((e) => e.id)).toEqual(["span"]);
    expect(result.current.byDay.get(dayKey(new Date(2026, 8, 16)))).toBeUndefined();
  });

  it("byDaySpan repeats a multi-day event on every day it covers", () => {
    const span = event("span", new Date(2026, 8, 15, 22).toISOString(), new Date(2026, 8, 17, 2).toISOString());
    const { result } = renderHook(() => useGroupedEvents([span]));
    for (const day of [15, 16, 17]) {
      expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, day)))?.map((e) => e.id)).toEqual(["span"]);
    }
    expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, 18)))).toBeUndefined();
  });

  it("byDaySpan treats the end as exclusive, so an event ending at midnight misses that day", () => {
    const morning = event("morning", new Date(2026, 8, 15, 9).toISOString(), new Date(2026, 8, 16, 0).toISOString());
    const { result } = renderHook(() => useGroupedEvents([morning]));
    expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, 15)))?.map((e) => e.id)).toEqual(["morning"]);
    expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, 16)))).toBeUndefined();
  });

  it("byDaySpan clamps expansion to the rendered range", () => {
    // A month-long event would otherwise expand across every day in the dataset.
    const long = event("long", new Date(2026, 8, 1).toISOString(), new Date(2026, 8, 31).toISOString());
    const range = { start: new Date(2026, 8, 10), end: new Date(2026, 8, 12) };
    const { result } = renderHook(() => useGroupedEvents([long], range));
    for (const day of [10, 11, 12]) {
      expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, day)))?.map((e) => e.id)).toEqual(["long"]);
    }
    expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, 9)))).toBeUndefined();
    expect(result.current.byDaySpan.get(dayKey(new Date(2026, 8, 13)))).toBeUndefined();
  });

  it("marks all-day events so views can route them out of the hour grid", () => {
    const allDay = event("allday", new Date(2026, 8, 15).toISOString(), new Date(2026, 8, 16).toISOString(), { allDay: true });
    const { result } = renderHook(() => useGroupedEvents([allDay]));
    expect(result.current.byDay.get(dayKey(new Date(2026, 8, 15)))?.[0].allDayFlag).toBe(true);
    expect(result.current.byDayHour.get(`${dayKey(new Date(2026, 8, 15))}:0`)?.[0].id).toBe("allday");
  });
});

describe("useEscapeKey", () => {
  it("fires on Escape only while active", () => {
    const onEscape = vi.fn();
    const { rerender, unmount } = renderHook(({ active }) => useEscapeKey(active, onEscape), { initialProps: { active: true } });

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);

    rerender({ active: false });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);

    rerender({ active: true });
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
