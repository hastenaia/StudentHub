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
