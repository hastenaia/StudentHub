/**
 * Pure logic for the Deadline Radar: buckets upcoming unsubmitted assignments
 * into a day-by-day heatmap over a rolling horizon and flags crunch weeks so
 * students see pile-ups before they happen.
 *
 * Deterministic and side-effect free — `now` is an explicit argument.
 */

export interface RadarAssignmentInput {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueAt: string | null;
  submitted: boolean;
}

export interface RadarItem {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueAt: string;
}

export type RadarLevel = 0 | 1 | 2 | 3;

export interface RadarDay {
  /** Local date key, YYYY-MM-DD. */
  date: string;
  isToday: boolean;
  isPast: boolean;
  items: RadarItem[];
  /** Heatmap intensity: 0 none · 1 light · 2 busy · 3 crunch. */
  level: RadarLevel;
}

export interface RadarWeek {
  startDate: string;
  endDate: string;
  label: string;
  itemCount: number;
  /** True when the week is a pile-up worth warning about. */
  crunch: boolean;
}

export interface DeadlineRadar {
  days: RadarDay[];
  weeks: RadarWeek[];
  /** Unsubmitted assignments whose due date has fully passed. */
  overdueCount: number;
  /** The busiest day in the horizon, or null when nothing is due. */
  heaviestDay: RadarDay | null;
}

export const DEFAULT_HORIZON_DAYS = 28;

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
export function radarDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function levelFor(count: number): RadarLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

/**
 * Build the radar. Only unsubmitted work inside [today, today+horizon) lands
 * on the grid; anything due before today counts toward `overdueCount`.
 */
export function buildDeadlineRadar(
  assignments: RadarAssignmentInput[],
  now: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS
): DeadlineRadar {
  const today = startOfDay(now);
  const horizonEnd = addDays(today, horizonDays).getTime();

  const pending = assignments.filter((a) => !a.submitted && a.dueAt != null);

  const overdueCount = pending.filter(
    (a) => new Date(a.dueAt as string).getTime() < today.getTime()
  ).length;

  const byDate = new Map<string, RadarItem[]>();
  for (const a of pending) {
    const dueMs = new Date(a.dueAt as string).getTime();
    if (dueMs < today.getTime() || dueMs >= horizonEnd) continue;
    const key = radarDayKey(new Date(dueMs));
    const item: RadarItem = {
      id: a.id,
      title: a.title,
      courseId: a.courseId,
      courseName: a.courseName,
      dueAt: a.dueAt as string,
    };
    const bucket = byDate.get(key);
    if (bucket) bucket.push(item);
    else byDate.set(key, [item]);
  }

  // Sort each day's items by exact due time.
  for (const bucket of byDate.values()) {
    bucket.sort((x, y) => x.dueAt.localeCompare(y.dueAt));
  }

  const days: RadarDay[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(today, i);
    const key = radarDayKey(date);
    const items = byDate.get(key) ?? [];
    days.push({
      date: key,
      isToday: i === 0,
      isPast: false,
      items,
      level: levelFor(items.length),
    });
  }

  const weeks: RadarWeek[] = [];
  for (let w = 0; w < horizonDays / 7; w++) {
    const weekDays = days.slice(w * 7, w * 7 + 7);
    const itemCount = weekDays.reduce((sum, d) => sum + d.items.length, 0);
    const hasPileUp = weekDays.some((d) => d.items.length >= 2);
    weeks.push({
      startDate: weekDays[0].date,
      endDate: weekDays[weekDays.length - 1].date,
      label: w === 0 ? "This week" : w === 1 ? "Next week" : `Week ${w + 1}`,
      itemCount,
      crunch: itemCount >= 3 || hasPileUp,
    });
  }

  const heaviestDay =
    days.reduce<RadarDay | null>(
      (heaviest, d) => (heaviest == null || d.items.length > heaviest.items.length ? d : heaviest),
      null
    ) ?? null;

  return {
    days,
    weeks,
    overdueCount,
    heaviestDay: heaviestDay && heaviestDay.items.length > 0 ? heaviestDay : null,
  };
}
