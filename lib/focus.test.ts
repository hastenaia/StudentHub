import { describe, expect, it } from "vitest";
import {
  computeStudyStats,
  dayKey,
  formatCountdown,
  formatMinutes,
  nextPhase,
  phaseDurationMinutes,
  PHASES_PER_LONG_BREAK,
} from "./focus";

/** Local-date constructor so tests behave the same in every timezone. */
function at(y: number, m: number, d: number, h = 12, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

function session(
  startedAt: Date | string,
  durationSeconds: number,
  courseId: string | null = null,
  kind = "focus"
) {
  return {
    startedAt: typeof startedAt === "string" ? startedAt : startedAt.toISOString(),
    durationSeconds,
    kind,
    courseId,
  };
}

describe("phase machine", () => {
  it("uses standard pomodoro durations", () => {
    expect(phaseDurationMinutes("focus")).toBe(25);
    expect(phaseDurationMinutes("break")).toBe(5);
    expect(phaseDurationMinutes("long_break")).toBe(15);
  });

  it("returns to focus after any break", () => {
    expect(nextPhase("break", 1)).toBe("focus");
    expect(nextPhase("long_break", 4)).toBe("focus");
  });

  it("gives a long break only on every Nth completed focus session", () => {
    expect(nextPhase("focus", 1)).toBe("break");
    expect(nextPhase("focus", 3)).toBe("break");
    expect(nextPhase("focus", PHASES_PER_LONG_BREAK)).toBe("long_break");
    expect(nextPhase("focus", PHASES_PER_LONG_BREAK * 2)).toBe("long_break");
  });
});

describe("computeStudyStats", () => {
  const now = at(2026, 8, 21, 15, 0); // Friday afternoon

  it("counts today's focus minutes and ignores breaks", () => {
    const stats = computeStudyStats(
      [
        session(at(2026, 8, 21, 9), 25 * 60),
        session(at(2026, 8, 21, 10), 5 * 60, null, "break"),
      ],
      now
    );
    expect(stats.minutesToday).toBe(25);
  });

  it("sums a full week of minutes across days and courses", () => {
    const stats = computeStudyStats(
      [
        session(at(2026, 8, 15), 60 * 60, "c1"), // 7 days back — included
        session(at(2026, 8, 20), 30 * 60, "c2"),
        session(at(2026, 8, 21, 8), 45 * 60, "c1"),
        session(at(2026, 8, 14), 90 * 60), // 8 days back — excluded
      ],
      now
    );
    expect(stats.minutesThisWeek).toBe(60 + 30 + 45);
    expect(stats.perCourse[0]).toEqual({ courseId: "c1", minutes: 105 });
    expect(stats.perCourse[1]).toEqual({ courseId: "c2", minutes: 30 });
  });

  it("buckets all seven days oldest-first with zero fills", () => {
    const stats = computeStudyStats([session(at(2026, 8, 21), 10 * 60)], now);
    expect(stats.daily).toHaveLength(7);
    expect(stats.daily[0].date).toBe(dayKey(at(2026, 8, 15)));
    expect(stats.daily[0].minutes).toBe(0);
    expect(stats.daily[6]).toEqual({ date: dayKey(now), minutes: 10 });
  });

  it("keeps a streak alive mid-day when yesterday was active", () => {
    const stats = computeStudyStats(
      [
        session(at(2026, 8, 19), 25 * 60),
        session(at(2026, 8, 20), 25 * 60),
        // nothing yet today
      ],
      now
    );
    expect(stats.streakDays).toBe(2);
  });

  it("extends the streak through today's completed session", () => {
    const stats = computeStudyStats(
      [
        session(at(2026, 8, 19), 25 * 60),
        session(at(2026, 8, 20), 25 * 60),
        session(at(2026, 8, 21, 9), 25 * 60),
      ],
      now
    );
    expect(stats.streakDays).toBe(3);
  });

  it("breaks the streak after a missed day", () => {
    const stats = computeStudyStats(
      [session(at(2026, 8, 18), 25 * 60), session(at(2026, 8, 20), 25 * 60)],
      now
    );
    // Today has no session yet -> starts from yesterday (the 20th) -> 1.
    expect(stats.streakDays).toBe(1);
  });

  it("reports an empty slate with zero everything", () => {
    const stats = computeStudyStats([], now);
    expect(stats).toMatchObject({
      minutesToday: 0,
      minutesThisWeek: 0,
      streakDays: 0,
      perCourse: [],
    });
    expect(stats.daily.every((d) => d.minutes === 0)).toBe(true);
  });
});

describe("formatting", () => {
  it("formats minutes compactly", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(125)).toBe("2h 05m");
  });

  it("formats countdowns as mm:ss", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(25 * 60)).toBe("25:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});
