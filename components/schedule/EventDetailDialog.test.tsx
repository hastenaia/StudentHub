import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventDetailDialog } from "./EventDetailDialog";
import type { ScheduleEvent } from "@/types/schedule";

function event(over: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "e1",
    courseId: null,
    courseName: null,
    courseColor: null,
    title: "Lab Report",
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

const renderDialog = (over: Partial<ScheduleEvent> = {}, handlers = {}) => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <EventDetailDialog
      event={event(over)}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      {...handlers}
    />
  );
  return { onClose, onEdit, onDelete };
};

describe("EventDetailDialog", () => {
  it("shows the title, type and time range", () => {
    renderDialog();
    expect(screen.getByText("Lab Report")).toBeTruthy();
    expect(screen.getByText("Assignment")).toBeTruthy();
    expect(screen.getByText(/9:00 AM - 10:00 AM/)).toBeTruthy();
  });

  it("offers Edit and Delete for a user event, and wires both up", () => {
    const { onEdit, onDelete } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("shows the course for a user event", () => {
    renderDialog({ courseName: "Chemistry" });
    expect(screen.getByText("Chemistry")).toBeTruthy();
  });

  it("falls back to a no-course label", () => {
    renderDialog();
    expect(screen.getByText("No course")).toBeTruthy();
  });

  it("marks Google events read-only and hides Edit and Delete", () => {
    renderDialog({ source: "google" });
    expect(screen.getByText(/Google Calendar, read-only/)).toBeTruthy();
    expect(screen.getByText(/read-only via sync/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("marks a task deadline read-only, points at the Tasks page, and shows the due time", () => {
    renderDialog({
      source: "task",
      allDay: true,
      title: "Read chapter 4",
      startAt: new Date(2026, 8, 15, 17, 0).toISOString(),
      endAt: new Date(2026, 8, 16, 0, 0).toISOString(),
    });
    expect(screen.getByText("Due")).toBeTruthy();
    expect(screen.getByText(/5:00 PM/)).toBeTruthy();
    expect(screen.getByText(/change them on the Tasks page/)).toBeTruthy();
    expect(screen.getByText(/from your Tasks, read-only here/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("never calls Edit or Delete for a task deadline", () => {
    const { onEdit, onDelete } = renderDialog({ source: "task" });
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("labels an all-day non-task event as such", () => {
    renderDialog({ allDay: true, startAt: new Date(2026, 8, 15).toISOString(), endAt: new Date(2026, 8, 16).toISOString() });
    expect(screen.getByText(/\(All day\)/)).toBeTruthy();
  });

  it("shows location and description only when present", () => {
    const { unmount } = render(
      <EventDetailDialog
        event={event({ location: "Room 204", description: "Chapters 1-4" })}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Room 204")).toBeTruthy();
    expect(screen.getByText("Chapters 1-4")).toBeTruthy();
    unmount();

    renderDialog();
    expect(screen.queryByText("Location")).toBeNull();
    expect(screen.queryByText("Description")).toBeNull();
  });

  it("closes from the backdrop, the Close button and the dismiss control", () => {
    const { onClose, unmount } = (() => {
      const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
      const utils = render(
        <EventDetailDialog event={event()} {...handlers} />
      );
      return { ...handlers, ...utils };
    })();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });
});