/**
 * Pure logic for the Focus Timer (Pomodoro) and study statistics.
 *
 * Everything here is deterministic and side-effect free: phase transitions
 * take explicit counters, stats take an explicit `now`, so the whole module
 * is unit-testable without mocking clocks.
 */

export type FocusPhase = "focus" | "break" | "long_break";

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;
/** A long break follows every Nth completed focus session. */
export const PHASES_PER_LONG_BREAK = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

export function phaseDurationMinutes(phase: FocusPhase): number {
  switch (phase) {
    case "focus":
      return FOCUS_MINUTES;
    case "break":
      return BREAK_MINUTES;
    case "long_break":
      return LONG_BREAK_MINUTES;
  }
}

export function phaseLabel(phase: FocusPhase): string {
  switch (phase) {
    case "focus":
      return "Focus";
    case "break":
      return "Short break";
    case "long_break":
      return "Long break";
  }
}

/**
 * The phase that follows a completed `phase`. `completedFocusCount` includes
 * the focus session that just finished; every PHASES_PER_LONG_BREAK-th one
 * earns a long break. Breaks always return to focus.
 */
export function nextPhase(phase: FocusPhase, completedFocusCount: number): FocusPhase {
  if (phase !== "focus") return "focus";
  return completedFocusCount % PHASES_PER_LONG_BREAK === 0 ? "long_break" : "break";
}

/** Input shape for stats — mirrors a study_sessions row. */
export interface StudySessionInput {
  startedAt: string;
  durationSeconds: number;
  kind: string;
  courseId: string | null;
}

export interface CourseMinutes {
  courseId: string | null;
  minutes: number;
}

export interface DailyMinutes {
  /** Local date key, YYYY-MM-DD. */
  date: string;
  minutes: number;
}

export interface StudyStats {
  minutesToday: number;
  minutesThisWeek: number;
  /**
   * Consecutive days with at least one focus session, ending today — or
   * yesterday when today's first session hasn't happened yet.
   */
  streakDays: number;
  /** Focus minutes per course over the last 7 days, descending by minutes. */
  perCourse: CourseMinutes[];
  /** Focus minutes per day for the last 7 days, oldest first. */
  daily: DailyMinutes[];
}

function startOfDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** Local YYYY-MM-DD key for a date. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Aggregate focus sessions into dashboard stats. Break sessions are ignored
 * for minute totals (they're rest, not study). Uses local day boundaries so
 * "today" matches what the student sees on their clock.
 */
export function computeStudyStats(sessions: StudySessionInput[], now: Date): StudyStats {
  const focusSessions = sessions.filter((s) => s.kind === "focus");

  const today = startOfDay(now);
  const todayKey = dayKey(today);

  // Last 7 local days, oldest first.
  const weekDays: string[] = [];
  for (let i = 6; i >= 0; i--) weekDays.push(dayKey(addDays(today, -i)));
  const weekDaySet = new Set(weekDays);

  let minutesToday = 0;
  let minutesThisWeek = 0;
  const perCourseTotals = new Map<string | null, number>();
  const dailyTotals = new Map<string, number>(weekDays.map((d) => [d, 0]));

  for (const s of focusSessions) {
    const started = new Date(s.startedAt);
    const key = dayKey(started);
    const minutes = s.durationSeconds / 60;

    if (key === todayKey) minutesToday += minutes;
    if (weekDaySet.has(key)) {
      minutesThisWeek += minutes;
      perCourseTotals.set(s.courseId, (perCourseTotals.get(s.courseId) ?? 0) + minutes);
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + minutes);
    }
  }

  // Streak: walk backwards from today; if today hasn't started yet, begin at
  // yesterday so an existing streak isn't reported as broken mid-day.
  const activeDays = new Set(focusSessions.map((s) => dayKey(new Date(s.startedAt))));
  let cursor = today;
  if (!activeDays.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streakDays = 0;
  while (activeDays.has(dayKey(cursor))) {
    streakDays++;
    cursor = addDays(cursor, -1);
  }

  const perCourse: CourseMinutes[] = [...perCourseTotals.entries()]
    .map(([courseId, minutes]) => ({ courseId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const daily: DailyMinutes[] = weekDays.map((date) => ({
    date,
    minutes: Math.round(dailyTotals.get(date) ?? 0),
  }));

  return {
    minutesToday: Math.round(minutesToday),
    minutesThisWeek: Math.round(minutesThisWeek),
    streakDays,
    perCourse,
    daily,
  };
}

/** "2h 05m", "45m", "0m". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** mm:ss countdown label. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** ISO timestamp `n` days before `now` (local-calendar safe). */
export function isoDaysAgo(now: Date, n: number): string {
  return addDays(startOfDay(now), -n).toISOString();
}

export { DAY_MS };
