/**
 * Pure logic for the Focus Timer (Pomodoro) and study statistics.
 *
 * Everything here is deterministic and side-effect free: phase transitions
 * take explicit counters, stats take an explicit `now`, so the whole module
 * is unit-testable without mocking clocks.
 */

export type FocusPhase = "focus" | "break" | "long_break";

/**
 * Configurable Pomodoro durations (minutes). All values are validated
 * integers: focus 1–120, break 1–30, longBreak 5–60, and longBreak >= break.
 * Kept separate from phase machine so tests can inject explicit durations.
 */
export interface PomodoroDurations {
  focus: number;
  break: number;
  longBreak: number;
}

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;
/** A long break follows every Nth completed focus session. */
export const PHASES_PER_LONG_BREAK = 4;

/** Default durations — used when localStorage is empty or migration occurs. */
export const DEFAULT_DURATIONS: PomodoroDurations = {
  focus: FOCUS_MINUTES,
  break: BREAK_MINUTES,
  longBreak: LONG_BREAK_MINUTES,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validate raw durations (e.g. from localStorage or form inputs).
 * Returns a clipped, integer-safe result or null if invalid.
 * - focus: int 1–120
 * - break: int 1–30
 * - longBreak: int 5–60 and >= break
 */
export function validateDurations(raw: unknown): PomodoroDurations | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const focus = Math.trunc(Number(r.focus));
  const brk = Math.trunc(Number(r.break));
  const longBreak = Math.trunc(Number(r.longBreak));
  if (!Number.isFinite(focus) || focus < 1 || focus > 120) return null;
  if (!Number.isFinite(brk) || brk < 1 || brk > 30) return null;
  if (!Number.isFinite(longBreak) || longBreak < 5 || longBreak > 60) return null;
  if (longBreak < brk) return null;
  return { focus, break: brk, longBreak };
}

/**
 * Duration for a phase given explicit durations. Falls back to DEFAULT_DURATIONS
 * when `d` is omitted so legacy call sites (`phaseDurationMinutes("focus")`) keep working.
 */
export function phaseDurationMinutes(phase: FocusPhase, d: PomodoroDurations = DEFAULT_DURATIONS): number {
  // Exhaustive switch — assertNever ensures compile-time coverage if FocusPhase grows.
  switch (phase) {
    case "focus":
      return d.focus;
    case "break":
      return d.break;
    case "long_break":
      return d.longBreak;
    default: {
      const _exhaustive: never = phase;
      return d.focus;
    }
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
