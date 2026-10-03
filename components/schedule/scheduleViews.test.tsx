import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventChip } from "./EventChip";
import { EventEmptyState } from "./EventEmptyState";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { AgendaView } from "./AgendaView";
import { eventTypeStyle } from "@/lib/scheduleView";
import { EVENT_TYPE_COLOR, type ScheduleEvent } from "@/types/schedule";

function event(id: string, start: Date, end: Date, over: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id,
    courseId: null,
    courseName: null,
    courseColor: null,
    title: id,
    description: null,
    location: null,
    eventType: "class",
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    allDay: false,
    color: null,
    source: "user",
    ...over,
  };
}

const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute);
const GOOGLE_READ_ONLY = /Google Calendar, read-only/;
const TASK_DUE = /task due date/;

/** A deadline as `lib/taskSchedule.ts` derives it: all-day flag, `assignment`, `task` source. */
function deadline(title: string, day: number, hour = 17): ScheduleEvent {
  return event(title, new Date(2026, 8, day, hour), new Date(2026, 8, day + 1, 0), {
    eventType: "assignment",
    allDay: true,
    source: "task",
  });
}

describe("EventChip", () => {
  it("takes its colour from eventTypeStyle so every view agrees", () => {
    const exam = event("Midterm", at(15, 10), at(15, 11), { eventType: "exam" });
    render(<EventChip event={exam} />);
    const chip = screen.getByText("Midterm");
    const style = eventTypeStyle(exam);
    expect(chip).toHaveStyle({ backgroundColor: style.bg, color: style.fg });
  });

  it("prefixes the start time only when asked, and never for all-day events", () => {
    const timed = event("Lecture", at(15, 14), at(15, 15));
    const { unmount } = render(<EventChip event={timed} showTime />);
    expect(screen.getByText(/2:00 PM/)).toBeTruthy();
    unmount();

    render(<EventChip event={timed} />);
    expect(screen.queryByText(/2:00 PM/)).toBeNull();
    expect(screen.getByText("Lecture")).toBeTruthy();

    const allDay = event("Reading", at(15, 0), at(16, 0), { allDay: true });
    render(<EventChip event={allDay} showTime />);
    expect(screen.getByText(/Reading/)).toBeTruthy();
  });

  it("derives legible text from a custom colour", () => {
    const pale = event("Pale", at(15, 10), at(15, 11), { color: "#FFF59D" });
    render(<EventChip event={pale} />);
    expect(screen.getByText("Pale")).toHaveStyle({ color: eventTypeStyle(pale).fg });
    expect(eventTypeStyle(pale).fg).not.toBe("#FFFFFF");
  });

  it("marks Google events as read-only for screen readers", () => {
    render(<EventChip event={event("Sync", at(15, 10), at(15, 11), { source: "google" })} />);
    expect(screen.getByText(GOOGLE_READ_ONLY)).toBeTruthy();
  });

  it("activates on click without bubbling to the surrounding grid cell", () => {
    const onEventClick = vi.fn();
    const onCellClick = vi.fn();
    render(
      <button onClick={onCellClick}>
        <EventChip event={event("Lecture", at(15, 10), at(15, 11))} onClick={onEventClick} />
      </button>
    );
    fireEvent.click(screen.getByText("Lecture"));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it.each(["Enter", " "])("is reachable by keyboard (%j)", (key) => {
    const onEventClick = vi.fn();
    render(<EventChip event={event("Lecture", at(15, 10), at(15, 11))} onClick={onEventClick} />);
    const chip = screen.getByText("Lecture").closest("[role='button']");
    expect(chip).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(chip!, { key });
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const onEventClick = vi.fn();
    render(<EventChip event={event("Lecture", at(15, 10), at(15, 11))} onClick={onEventClick} />);
    fireEvent.keyDown(screen.getByText("Lecture").closest("[role='button']")!, { key: "a" });
    expect(onEventClick).not.toHaveBeenCalled();
  });

  it("shows the full time range in the day view's row layout", () => {
    render(<EventChip event={event("Lecture", at(15, 14), at(15, 15, 30))} layout="row" />);
    expect(screen.getByText("2:00 PM - 3:30 PM")).toBeTruthy();
  });

  it("leaves out the Google marker for the user's own events", () => {
    render(<EventChip event={event("Lecture", at(15, 10), at(15, 11))} />);
    expect(screen.queryByText(GOOGLE_READ_ONLY)).toBeNull();
  });
});

describe("EventEmptyState", () => {
  it.each([
    ["month", "No events this month."],
    ["week", "No events this week"],
    ["day", "No events this day"],
    ["agenda", "No events in this period."],
  ] as const)("keeps the %s copy and offers a create action", (view, copy) => {
    const onCreate = vi.fn();
    render(<EventEmptyState view={view} onCreate={onCreate} />);
    expect(screen.getByText(new RegExp(copy.replace(".", "\\.")))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /New event/ }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe("MonthView", () => {
  const currentDate = new Date(2026, 8, 15);

  it("renders a seven-column grid with weekday headers", () => {
    render(<MonthView currentDate={currentDate} events={[]} onEventClick={vi.fn()} onDateClick={vi.fn()} />);
    for (const d of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByText(d)).toBeTruthy();
    }
  });

  it("places chips on their own day and shows a time prefix", () => {
    render(
      <MonthView
        currentDate={currentDate}
        events={[event("Lecture", at(15, 10), at(15, 11))]}
        onEventClick={vi.fn()}
        onDateClick={vi.fn()}
      />
    );
    const chip = screen.getByText(/Lecture/);
    expect(chip).toBeTruthy();
    expect(screen.getByLabelText(/September 15, 1 events/)).toBeTruthy();
  });

  it("caps the chips per day and reports the overflow", () => {
    const many = [10, 11, 12, 13].map((h) => event(`E${h}`, at(15, h), at(15, h + 1)));
    render(<MonthView currentDate={currentDate} events={many} onEventClick={vi.fn()} onDateClick={vi.fn()} />);
    expect(screen.getByText("+1 more")).toBeTruthy();
  });

  it("repeats a multi-day event on every day it covers", () => {
    const span = event("Study block", at(15, 22), at(17, 2));
    render(<MonthView currentDate={currentDate} events={[span]} onEventClick={vi.fn()} onDateClick={vi.fn()} />);
    expect(screen.getAllByText(/Study block/)).toHaveLength(3);
    for (const day of [15, 16, 17]) {
      expect(screen.getByLabelText(new RegExp(`September ${day}, 1 events`))).toBeTruthy();
    }
  });

  it("opens the event rather than the day when a chip is clicked", () => {
    const onEventClick = vi.fn();
    const onDateClick = vi.fn();
    render(
      <MonthView
        currentDate={currentDate}
        events={[event("Lecture", at(15, 10), at(15, 11))]}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />
    );
    fireEvent.click(screen.getByText(/Lecture/));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onDateClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/September 16, 0 events/));
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });
});

describe("WeekView", () => {
  const wednesday = new Date(2026, 8, 16);

  it("puts all-day events in their own lane instead of an hour row", () => {
    const allDay = event("Reading day", at(15, 0), at(16, 0), { allDay: true });
    render(<WeekView currentDate={wednesday} events={[allDay]} onEventClick={vi.fn()} onTimeClick={vi.fn()} />);
    expect(screen.getByText("All day")).toBeTruthy();
    // Once in the lane; not repeated on the midnight hour row.
    expect(screen.getAllByText("Reading day")).toHaveLength(1);
  });

  it("omits the all-day lane when the week has none", () => {
    render(
      <WeekView
        currentDate={wednesday}
        events={[event("Lecture", at(15, 10), at(15, 11))]}
        onEventClick={vi.fn()}
        onTimeClick={vi.fn()}
      />
    );
    expect(screen.queryByText("All day")).toBeNull();
  });

  it("collects events outside working hours into the other-times strip", () => {
    render(
      <WeekView
        currentDate={wednesday}
        events={[event("Lecture", at(15, 10), at(15, 11)), event("Gym", at(15, 20), at(15, 21))]}
        onEventClick={vi.fn()}
        onTimeClick={vi.fn()}
      />
    );
    expect(screen.getByText(/other times/)).toBeTruthy();
    expect(screen.getAllByText(/Gym/)).toHaveLength(1);
  });

  it("shows a multi-day event once per day without duplicating it in the strip", () => {
    // 23:00 Tue → 02:00 Thu: outside working hours on both, so only the strip should carry it.
    const span = event("Study block", at(15, 23), at(17, 2));
    render(<WeekView currentDate={wednesday} events={[span]} onEventClick={vi.fn()} onTimeClick={vi.fn()} />);
    expect(screen.getAllByText(/Study block/)).toHaveLength(3);
    expect(screen.getAllByText(/other times/)).toHaveLength(3);
  });

  it("offers a create action per slot", () => {
    const onTimeClick = vi.fn();
    render(<WeekView currentDate={wednesday} events={[]} onEventClick={vi.fn()} onTimeClick={onTimeClick} />);
    fireEvent.click(screen.getByLabelText("Add event Sep 16 at 9 AM"));
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    const [date, hour] = onTimeClick.mock.calls[0];
    expect(date.getDate()).toBe(16);
    expect(hour).toBe(9);
  });

  it("reports an event click from any lane", () => {
    const onEventClick = vi.fn();
    render(
      <WeekView
        currentDate={wednesday}
        events={[event("Lecture", at(16, 10), at(16, 11))]}
        onEventClick={onEventClick}
        onTimeClick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Lecture"));
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });
});

describe("DayView", () => {
  const currentDate = new Date(2026, 8, 15);

  it("separates all-day events from the hour rows", () => {
    render(
      <DayView
        currentDate={currentDate}
        events={[
          event("Reading day", at(15, 0), at(16, 0), { allDay: true }),
          event("Lecture", at(15, 14), at(15, 15)),
        ]}
        onEventClick={vi.fn()}
        onTimeClick={vi.fn()}
      />
    );
    expect(screen.getByText("All day")).toBeTruthy();
    expect(screen.getAllByText("Reading day")).toHaveLength(1);
    expect(screen.getByText("2:00 PM - 3:00 PM")).toBeTruthy();
  });

  it("carries an event that began the previous day onto this day", () => {
    // 22:00 the 14th → 06:00 the 15th: clipped to this day it must occupy 12 AM–5 AM, not vanish
    // and not reappear under its original 10 PM start hour.
    const overnight = event("Night shift", at(14, 22), at(15, 6));
    render(<DayView currentDate={new Date(2026, 8, 15)} events={[overnight]} onEventClick={vi.fn()} onTimeClick={vi.fn()} />);
    const midnightRow = screen.getByLabelText("Add event at 12 AM").closest("div")!;
    expect(midnightRow.textContent).toContain("Night shift");
    const afterMidnight = screen.getByLabelText("Add event at 6 AM").closest("div")!;
    expect(afterMidnight.textContent).not.toContain("Night shift");
  });

  it("offers all 24 hours and reports the chosen slot", () => {
    const onTimeClick = vi.fn();
    render(<DayView currentDate={currentDate} events={[]} onEventClick={vi.fn()} onTimeClick={onTimeClick} />);
    fireEvent.click(screen.getByLabelText("Add event at 9 AM"));
    expect(onTimeClick).toHaveBeenCalledWith(9);
    fireEvent.click(screen.getByLabelText("Add event at 12 AM"));
    expect(onTimeClick).toHaveBeenCalledWith(0);
  });
});

describe("AgendaView", () => {
  it("renders nothing when there are no events, leaving the empty state to the caller", () => {
    const { container } = render(<AgendaView events={[]} onEventClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("groups by day in chronological order", () => {
    const events = [
      event("Later", at(17, 14), at(17, 15)),
      event("Earlier", at(15, 9), at(15, 10)),
      event("Same day evening", at(15, 18), at(15, 19)),
    ];
    render(<AgendaView events={events} onEventClick={vi.fn()} />);
    const headings = screen.getAllByRole("heading").map((h) => h.textContent ?? "");
    expect(headings).toHaveLength(2);
    expect(headings[0]).toContain("Tuesday");
    expect(headings[1]).toContain("Thursday");
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items[0]).toContain("Earlier");
    expect(items[1]).toContain("Same day evening");
  });

  it("lists a multi-day event once, on the day it starts", () => {
    const span = event("Study block", at(15, 22), at(17, 2));
    const { container } = render(<AgendaView events={[span]} onEventClick={vi.fn()} />);
    expect(container.querySelectorAll("li")).toHaveLength(1);
  });

  it("labels the type, marks Google events read-only, and opens the detail", () => {
    const onEventClick = vi.fn();
    render(
      <AgendaView
        events={[
          event("Sync", at(15, 9), at(15, 10), { source: "google", eventType: "exam" }),
          event("Lecture", at(15, 11), at(15, 12), { location: "Room 204", courseName: "Physics" }),
        ]}
        onEventClick={onEventClick}
      />
    );
    expect(screen.getByText("Exam")).toBeTruthy();
    expect(screen.getByText(GOOGLE_READ_ONLY)).toBeTruthy();
    expect(screen.getByText("Room 204")).toBeTruthy();
    expect(screen.getByText("Physics")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });

  it("shows all-day events without a time range", () => {
    render(<AgendaView events={[event("Reading day", at(15, 0), at(16, 0), { allDay: true })]} onEventClick={vi.fn()} />);
    expect(screen.getByText("All day")).toBeTruthy();
  });
});

describe("task deadlines", () => {
  it("appears in the month cell for the due day", () => {
    render(
      <MonthView
        currentDate={new Date(2026, 8, 15)}
        events={[deadline("Read chapter 4", 15)]}
        onEventClick={vi.fn()}
        onDateClick={vi.fn()}
      />
    );
    expect(screen.getByText(/Read chapter 4/)).toBeTruthy();
  });

  it("sits in the week all-day lane, not in an hour row", () => {
    const onTimeClick = vi.fn();
    render(
      <WeekView
        currentDate={new Date(2026, 8, 15)}
        events={[deadline("Read chapter 4", 15)]}
        onEventClick={vi.fn()}
        onTimeClick={onTimeClick}
      />
    );
    expect(screen.getByText("All day")).toBeTruthy();
    const lane = screen.getByText("All day").closest("div")!.parentElement!;
    expect(lane.textContent).toContain("Read chapter 4");
    // A deadline is never a bookable hour slot.
    expect(onTimeClick).not.toHaveBeenCalled();
  });

  it("appears in the day view and keeps its due time visible", () => {
    render(
      <DayView
        currentDate={new Date(2026, 8, 15)}
        events={[deadline("Read chapter 4", 15, 17)]}
        onEventClick={vi.fn()}
        onTimeClick={vi.fn()}
      />
    );
    expect(screen.getByText(/Read chapter 4/)).toBeTruthy();
    expect(screen.getByText(/Due 5:00 PM/)).toBeTruthy();
  });

  it("shows as a deadline rather than a bare all-day entry in the agenda", () => {
    render(<AgendaView events={[deadline("Read chapter 4", 15, 17)]} onEventClick={vi.fn()} />);
    expect(screen.getByText("Due 5:00 PM")).toBeTruthy();
    expect(screen.queryByText("All day")).toBeNull();
    expect(screen.getByText(TASK_DUE)).toBeTruthy();
  });

  it("marks the chip as a task for screen readers", () => {
    render(<EventChip event={deadline("Read chapter 4", 15)} />);
    expect(screen.getByText(TASK_DUE)).toBeTruthy();
  });

  it("does not masquerade as a Google event", () => {
    render(<EventChip event={deadline("Read chapter 4", 15)} />);
    expect(screen.queryByText(GOOGLE_READ_ONLY)).toBeNull();
  });

  it("uses the assignment colour so the existing legend still explains it", () => {
    const due = deadline("Read chapter 4", 15);
    render(<EventChip event={due} />);
    expect(screen.getByText(/Read chapter 4/)).toHaveStyle({
      backgroundColor: EVENT_TYPE_COLOR.assignment,
    });
  });

  it("surfaces the due time in the chip tooltip", () => {
    render(<EventChip event={deadline("Read chapter 4", 15, 17)} />);
    const chip = screen.getByTitle(/Due .*Read chapter 4/);
    expect(chip.getAttribute("title")).toContain("5:00 PM");
  });

  it("opens the shared detail dialog when clicked, like any other entry", () => {
    const onEventClick = vi.fn();
    render(<EventChip event={deadline("Read chapter 4", 15)} onClick={onEventClick} />);
    fireEvent.click(screen.getByText(/Read chapter 4/));
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });
});

describe("cross-view consistency", () => {
  /** Every coloured element currently on screen, whatever view produced it. */
  function chipColours() {
    return Array.from(document.querySelectorAll<HTMLElement>("[style]"))
      .map((el) => el.style.backgroundColor)
      .filter(Boolean);
  }

  const asRgb = (hex: string) => {
    const packed = parseInt(hex.slice(1), 16);
    return `rgb(${(packed >> 16) & 255}, ${(packed >> 8) & 255}, ${packed & 255})`;
  };

  it("gives one event the same colour in every view", () => {
    const exam = event("Midterm", at(15, 10), at(15, 11), { eventType: "exam" });
    const views = [
      <MonthView key="m" currentDate={new Date(2026, 8, 15)} events={[exam]} onEventClick={vi.fn()} onDateClick={vi.fn()} />,
      <WeekView key="w" currentDate={new Date(2026, 8, 15)} events={[exam]} onEventClick={vi.fn()} onTimeClick={vi.fn()} />,
      <DayView key="d" currentDate={new Date(2026, 8, 15)} events={[exam]} onEventClick={vi.fn()} onTimeClick={vi.fn()} />,
      <AgendaView key="a" events={[exam]} onEventClick={vi.fn()} />,
    ];
    expect(eventTypeStyle(exam).bg).toBe(EVENT_TYPE_COLOR.exam);
    for (const view of views) {
      const { unmount } = render(view);
      expect(screen.getAllByText(/Midterm/).length).toBeGreaterThan(0);
      expect(chipColours()).toContain(asRgb(EVENT_TYPE_COLOR.exam));
      unmount();
    }
  });
});
