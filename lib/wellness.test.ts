import { describe, expect, it } from "vitest";
import { buildWeeklyMood, summarizeActivity, workloadSuggestion } from "./wellness";

const now = new Date("2026-09-15T12:00:00Z");

describe("buildWeeklyMood", () => {
  it("returns 7 days ending today with logged moods or null", () => {
    const points = buildWeeklyMood([{ entryDate: "2026-09-15", mood: 4 }, { entryDate: "2026-09-10", mood: 2 }], now);
    expect(points).toHaveLength(7);
    expect(points[6]).toMatchObject({ date: "2026-09-15", mood: 4 });
    expect(points[1]).toMatchObject({ date: "2026-09-10", mood: 2 });
    expect(points[0].mood).toBeNull();
  });
});

describe("summarizeActivity", () => {
  it("counts only today's activity and deadlines within 7 days", () => {
    const summary = summarizeActivity(
      {
        focus: [
          { started_at: "2026-09-15T08:00:00Z", duration_minutes: 25 },
          { started_at: "2026-09-15T09:00:00Z", duration_minutes: null },
          { started_at: "2026-09-14T09:00:00Z", duration_minutes: 50 },
        ],
        tasks: [
          { status: "done", completed_at: "2026-09-15T10:00:00Z" },
          { status: "todo", completed_at: "2026-09-15T10:00:00Z" },
          { status: "done", completed_at: null },
        ],
        schedule: [
          { event_type: "study_session", start_at: "2026-09-15T14:00:00Z" },
          { event_type: "exam", start_at: "2026-09-15T14:00:00Z" },
        ],
        assignments: [
          { due_at: "2026-09-16T12:00:00Z" },
          { due_at: "2026-09-25T12:00:00Z" },
          { due_at: "2026-09-14T12:00:00Z" },
          { due_at: null },
          { due_at: "not a date" },
        ],
      },
      now
    );
    expect(summary).toEqual({
      focusMinutesToday: 25,
      focusSessionsToday: 2,
      completedTasksToday: 1,
      studySessionsToday: 1,
      upcomingDeadlinesCount: 1,
    });
  });
});

describe("workloadSuggestion", () => {
  const base = { focusMinutesToday: 0, focusSessionsToday: 0, completedTasksToday: 0, studySessionsToday: 0, upcomingDeadlinesCount: 0 };
  it("picks the first matching rule", () => {
    expect(workloadSuggestion({ ...base, focusMinutesToday: 200 })).toMatch(/3 hours/);
    expect(workloadSuggestion({ ...base, focusMinutesToday: 95 })).toMatch(/95 minutes of focus today\. A short break/);
    expect(workloadSuggestion({ ...base, focusMinutesToday: 10, upcomingDeadlinesCount: 9 })).toMatch(/Keep the momentum/);
    expect(workloadSuggestion({ ...base, upcomingDeadlinesCount: 4 })).toMatch(/4 deadlines/);
    expect(workloadSuggestion({ ...base, completedTasksToday: 1 })).toMatch(/1 task today/);
    expect(workloadSuggestion(base)).toMatch(/No focus sessions yet/);
  });
});
