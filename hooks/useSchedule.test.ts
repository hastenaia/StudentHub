// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleDialogs } from "@/hooks/useScheduleDialogs";
import { useFilteredEvents } from "@/hooks/useFilteredEvents";
import type { CalendarView, ScheduleEvent } from "@/types/schedule";

function event(over: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "e1",
    courseId: null,
    courseName: null,
    courseColor: null,
    title: "Lab",
    description: null,
    location: null,
    eventType: "assignment",
    startAt: new Date(2026, 8, 15, 9, 0).toISOString(),
    endAt: new Date(2026, 8, 15, 10, 0).toISOString(),
    allDay: false,
    color: null,
    source: "user",
    ...over,
  };
}

describe("useScheduleDialogs", () => {
  const now = new Date(2026, 8, 15, 12, 0);

  it("starts with every dialog closed", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    expect(result.current.formOpen).toBe(false);
    expect(result.current.editing).toBeNull();
    expect(result.current.defaultDate).toBeUndefined();
    expect(result.current.detailEvent).toBeNull();
    expect(result.current.deleteEvent).toBeNull();
  });

  it("prefills the form with the visible date when no date is passed", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    act(() => result.current.openCreate());
    expect(result.current.formOpen).toBe(true);
    expect(result.current.defaultDate).toBe(now.toISOString());
    expect(result.current.editing).toBeNull();
  });

  it("accepts a Date or an ISO string for the prefilled date", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    const target = new Date(2026, 8, 20, 8, 0);

    act(() => result.current.openCreate(target));
    expect(result.current.defaultDate).toBe(target.toISOString());

    act(() => result.current.openCreate(target.toISOString()));
    expect(result.current.defaultDate).toBe(target.toISOString());
  });

  it("refuses to open the form for a read-only task deadline", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    act(() => result.current.openEdit(event({ source: "task", id: "task:e1" })));
    expect(result.current.formOpen).toBe(false);
    expect(result.current.editing).toBeNull();
  });

  it("refuses to open the form for a Google event", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    act(() => result.current.openEdit(event({ source: "google" })));
    expect(result.current.formOpen).toBe(false);
  });

  it("opens the form seeded with the edited user event and closes the detail dialog", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    const target = event({ id: "u9" });

    act(() => result.current.openDetail(target));
    expect(result.current.detailEvent).toEqual(target);

    act(() => result.current.openEdit(target));
    expect(result.current.editing).toEqual(target);
    expect(result.current.formOpen).toBe(true);
    expect(result.current.detailEvent).toBeNull();
  });

  it("clears the prefill on close so reopening starts fresh", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    act(() => result.current.openCreate(new Date(2026, 8, 20)));
    act(() => result.current.closeForm());
    expect(result.current.formOpen).toBe(false);
    expect(result.current.defaultDate).toBeUndefined();
    expect(result.current.editing).toBeNull();
  });

  it("clears everything on dismissAll", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    const target = event();

    act(() => result.current.openCreate(new Date(2026, 8, 20)));
    act(() => result.current.openDetail(target));
    act(() => result.current.requestDelete(target));
    expect(result.current.deleteEvent).toEqual(target);

    act(() => result.current.dismissAll());
    expect(result.current.formOpen).toBe(false);
    expect(result.current.detailEvent).toBeNull();
    expect(result.current.deleteEvent).toBeNull();
    expect(result.current.defaultDate).toBeUndefined();
  });

  it("closes the detail and delete dialogs independently", () => {
    const { result } = renderHook(() => useScheduleDialogs(now));
    const target = event();

    act(() => result.current.openDetail(target));
    act(() => result.current.closeDetail());
    expect(result.current.detailEvent).toBeNull();

    act(() => result.current.requestDelete(target));
    act(() => result.current.cancelDelete());
    expect(result.current.deleteEvent).toBeNull();
  });
});

describe("useFilteredEvents", () => {
  const currentDate = new Date(2026, 8, 15, 12, 0);

  function filteredFor(view: CalendarView, events: ScheduleEvent[]) {
    return renderHook(() => useFilteredEvents(events, view, currentDate)).result.current;
  }

  beforeEach(() => vi.useRealTimers());

  it("keeps only events overlapping the day view", () => {
    const kept = filteredFor("day", [
      event({ id: "in", startAt: new Date(2026, 8, 15, 9).toISOString(), endAt: new Date(2026, 8, 15, 10).toISOString() }),
      event({ id: "before", startAt: new Date(2026, 8, 14, 9).toISOString(), endAt: new Date(2026, 8, 14, 10).toISOString() }),
      event({ id: "after", startAt: new Date(2026, 8, 16, 9).toISOString(), endAt: new Date(2026, 8, 16, 10).toISOString() }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["in"]);
  });

  it("keeps an event that merely overlaps the boundary", () => {
    const kept = filteredFor("day", [
      event({ id: "spans", startAt: new Date(2026, 8, 14, 23).toISOString(), endAt: new Date(2026, 8, 16, 1).toISOString() }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["spans"]);
  });

  it("sorts by start time", () => {
    const kept = filteredFor("day", [
      event({ id: "late", startAt: new Date(2026, 8, 15, 18).toISOString(), endAt: new Date(2026, 8, 15, 19).toISOString() }),
      event({ id: "early", startAt: new Date(2026, 8, 15, 6).toISOString(), endAt: new Date(2026, 8, 15, 7).toISOString() }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["early", "late"]);
  });

  it("returns everything in start order for the agenda", () => {
    const kept = filteredFor("agenda", [
      event({ id: "dec", startAt: new Date(2026, 11, 1, 9).toISOString(), endAt: new Date(2026, 11, 1, 10).toISOString() }),
      event({ id: "sep", startAt: new Date(2026, 8, 15, 9).toISOString(), endAt: new Date(2026, 8, 15, 10).toISOString() }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["sep", "dec"]);
  });

  it("shows a task deadline on its due day", () => {
    const kept = filteredFor("day", [
      event({
        id: "task:e1",
        source: "task",
        allDay: true,
        startAt: new Date(2026, 8, 15, 17).toISOString(),
        endAt: new Date(2026, 8, 16, 0).toISOString(),
      }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["task:e1"]);
  });

  it("shows a month-grid overflow event that starts before the month", () => {
    // 31 Aug, but the September grid starts on Sun 30 Aug, so it must appear.
    const kept = filteredFor("month", [
      event({
        id: "overflow",
        startAt: new Date(2026, 7, 31, 9).toISOString(),
        endAt: new Date(2026, 7, 31, 10).toISOString(),
      }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["overflow"]);
  });

  it("hides an event from the previous month that is well outside the grid", () => {
    const kept = filteredFor("month", [
      event({ id: "old", startAt: new Date(2026, 5, 1, 9).toISOString(), endAt: new Date(2026, 5, 1, 10).toISOString() }),
    ]);
    expect(kept).toEqual([]);
  });

  it("tolerates unparseable timestamps instead of throwing", () => {
    const kept = filteredFor("day", [
      event({ id: "bad", startAt: "not-a-date", endAt: "also-bad" }),
      event({ id: "good", startAt: new Date(2026, 8, 15, 9).toISOString(), endAt: new Date(2026, 8, 15, 10).toISOString() }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["good"]);
  });

  it("recomputes when the view or date changes", () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: CalendarView }) => useFilteredEvents([event()], view, currentDate),
      { initialProps: { view: "day" as CalendarView } }
    );
    expect(result.current).toHaveLength(1);

    rerender({ view: "agenda" });
    expect(result.current).toHaveLength(1);
  });
});