import { describe, expect, it } from "vitest";
import { courseRowToView, toCourseOptions } from "@/lib/courseView";
import { taskRowToView, taskToDraft } from "@/lib/taskView";
import { calendarRowToView, scheduleRowToView } from "@/lib/scheduleView";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
// Fixtures only set the columns the mappers read; the cast keeps them short.
const row = <T extends keyof Tables>(fields: Partial<Tables[T]["Row"]>) => fields as Tables[T]["Row"];

describe("courseView", () => {
  it("toCourseOptions prefers course_name and nulls a missing color", () => {
    expect(toCourseOptions([{ id: "1", name: "legacy", course_name: "Canonical" }, { id: "2", name: "Only", course_name: null, color: "#fff" }])).toEqual([
      { id: "1", name: "Canonical", color: null },
      { id: "2", name: "Only", color: "#fff" },
    ]);
    expect(toCourseOptions(null)).toEqual([]);
  });

  it("courseRowToView falls back to the legacy name / teacher_name columns", () => {
    const view = courseRowToView(
      row<"courses">({ id: "c", name: "Legacy", course_name: null, instructor: null, teacher_name: "Dr. T", source: "classroom", google_course_id: "g1", created_at: "a", updated_at: "b" })
    );
    expect(view).toMatchObject({ id: "c", course_name: "Legacy", instructor: "Dr. T", source: "classroom", google_course_id: "g1", course_code: null, room: null });
  });
});

describe("taskView", () => {
  const taskRow = row<"tasks">({
    id: "t",
    title: "Essay",
    description: null,
    status: "todo",
    priority: "high",
    tags: null as unknown as string[], // defensive: mapper falls back to []
    due_at: "2026-09-20T00:00:00Z",
    estimate_minutes: 30,
    recurrence_freq: null,
    recurrence_interval: 1,
    recur_until: null,
    course_id: "c1",
    sort_order: 3,
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
  });

  it("maps snake_case to the view model and resolves the course", () => {
    const view = taskRowToView(taskRow, new Map([["c1", { id: "c1", name: "Math", color: "#123" }]]));
    expect(view).toMatchObject({ id: "t", tags: [], dueAt: "2026-09-20T00:00:00Z", estimateMinutes: 30, courseName: "Math", courseColor: "#123", sortOrder: 3 });
  });

  it("leaves course fields null for an unknown or missing course", () => {
    expect(taskRowToView(taskRow, new Map())).toMatchObject({ courseId: "c1", courseName: null, courseColor: null });
  });

  it("taskToDraft keeps only the editable fields", () => {
    const draft = taskToDraft(taskRowToView(taskRow, new Map()));
    expect(Object.keys(draft).sort()).toEqual(
      ["courseId", "description", "dueAt", "estimateMinutes", "priority", "recurUntil", "recurrenceFreq", "recurrenceInterval", "status", "tags", "title"].sort()
    );
  });
});

describe("scheduleView", () => {
  it("scheduleRowToView marks user events and resolves the course", () => {
    const view = scheduleRowToView(
      row<"schedule_events">({ id: "e", course_id: "c1", title: "Exam", event_type: "exam", start_at: "s", end_at: "e", all_day: false, color: null }),
      new Map([["c1", { name: "Physics", color: "#f00" }]])
    );
    expect(view).toMatchObject({ source: "user", eventType: "exam", courseName: "Physics", courseColor: "#f00" });
  });

  it("calendarRowToView marks Google events read-only-ish and fills missing times", () => {
    const base = { id: "g", summary: "Standup", all_day: false, google_event_id: "gid", created_at: "2026-09-01T00:00:00Z" };
    expect(calendarRowToView(row<"calendar_events">({ ...base, start_at: "S", end_at: null }))).toMatchObject({
      source: "google",
      eventType: "other",
      title: "Standup",
      startAt: "S",
      endAt: "S",
      googleEventId: "gid",
    });
    expect(calendarRowToView(row<"calendar_events">({ ...base, start_at: null, end_at: null }))).toMatchObject({
      startAt: base.created_at,
      endAt: base.created_at,
    });
  });
});
