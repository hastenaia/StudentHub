import { describe, expect, it } from "vitest";
import { buildDeadlineRadar, radarDayKey, type RadarAssignmentInput } from "./deadlineRadar";

function at(y: number, m: number, d: number, h = 12): Date {
  return new Date(y, m - 1, d, h, 0, 0, 0);
}

function assignment(
  id: string,
  dueAt: Date | string | null,
  overrides: Partial<RadarAssignmentInput> = {}
): RadarAssignmentInput {
  return {
    id,
    title: `Assignment ${id}`,
    courseId: "c1",
    courseName: "Course 1",
    dueAt: dueAt == null ? null : typeof dueAt === "string" ? dueAt : dueAt.toISOString(),
    submitted: false,
    ...overrides,
  };
}

const now = at(2026, 8, 21, 15); // Friday afternoon

describe("buildDeadlineRadar", () => {
  it("places unsubmitted work on the right day and sorts by time", () => {
    const radar = buildDeadlineRadar(
      [
        assignment("a2", at(2026, 8, 21, 23)),
        assignment("a1", at(2026, 8, 21, 9)),
        assignment("a3", at(2026, 8, 24)),
      ],
      now
    );

    const today = radar.days[0];
    expect(today.isToday).toBe(true);
    expect(today.items.map((i) => i.id)).toEqual(["a1", "a2"]);
    expect(today.level).toBe(2);

    const monday = radar.days[3]; // Aug 24
    expect(monday.items).toHaveLength(1);
    expect(monday.level).toBe(1);
  });

  it("excludes submitted work and items beyond the horizon", () => {
    const radar = buildDeadlineRadar(
      [
        assignment("done", at(2026, 8, 22), { submitted: true }),
        assignment("far", at(2026, 10, 1)), // ~40 days out
        assignment("noDate", null),
      ],
      now
    );
    expect(radar.days.every((d) => d.items.length === 0)).toBe(true);
    expect(radar.heaviestDay).toBeNull();
  });

  it("counts fully-passed unsubmitted work as overdue, not on the grid", () => {
    const radar = buildDeadlineRadar(
      [assignment("old", at(2026, 8, 20, 23)), assignment("today", at(2026, 8, 21, 23))],
      now
    );
    // Due yesterday evening -> overdue; due tonight -> still on today's cell.
    expect(radar.overdueCount).toBe(1);
    expect(radar.days[0].items.map((i) => i.id)).toEqual(["today"]);
  });

  it("flags crunch weeks from a total of 3+ deadlines", () => {
    const radar = buildDeadlineRadar(
      [
        assignment("a", at(2026, 8, 22)),
        assignment("b", at(2026, 8, 25)),
        assignment("c", at(2026, 8, 26)),
      ],
      now
    );
    // All three fall inside the first 7-day window (Aug 21-27).
    expect(radar.weeks[0].itemCount).toBe(3);
    expect(radar.weeks[0].crunch).toBe(true);
    expect(radar.weeks[1].crunch).toBe(false);
  });

  it("flags crunch weeks when two deadlines share one day", () => {
    const radar = buildDeadlineRadar(
      [assignment("a", at(2026, 8, 26, 9)), assignment("b", at(2026, 8, 26, 17))],
      now
    );
    expect(radar.weeks[0].itemCount).toBe(2);
    expect(radar.weeks[0].crunch).toBe(true);
  });

  it("labels weeks and produces exactly four of them over 28 days", () => {
    const radar = buildDeadlineRadar([], now);
    expect(radar.weeks.map((w) => w.label)).toEqual([
      "This week",
      "Next week",
      "Week 3",
      "Week 4",
    ]);
    expect(radar.days).toHaveLength(28);
    expect(radar.overdueCount).toBe(0);
  });

  it("reports the heaviest day within the horizon", () => {
    const radar = buildDeadlineRadar(
      [
        assignment("a", at(2026, 9, 2)),
        assignment("b", at(2026, 9, 2, 18)),
        assignment("c", at(2026, 9, 3)),
      ],
      now
    );
    expect(radar.heaviestDay?.date).toBe(radarDayKey(at(2026, 9, 2)));
    expect(radar.heaviestDay?.items).toHaveLength(2);
    expect(radar.heaviestDay?.level).toBe(2);
  });
});
