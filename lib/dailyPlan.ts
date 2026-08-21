/**
 * Pure logic for the Smart Daily Plan: answers "what should I work on right
 * now?" by merging open tasks, upcoming unsubmitted assignments and today's
 * calendar into one prioritized list plus the free windows left in the day.
 *
 * Ordering mirrors lib/scheduling.ts (deadline-proximity tiers first), so the
 * dashboard plan and the Tasks page agree on what matters most.
 */

import type { TaskPriority } from "@/types/tasks";

const HOUR_MS = 3_600_000;

/** Study-hours bounds used when computing free windows (local time). */
export const STUDY_DAY_START_HOUR = 8;
export const STUDY_DAY_END_HOUR = 22;
/** Gaps shorter than this aren't worth suggesting. */
export const MIN_FREE_WINDOW_MINUTES = 30;

/** How far ahead assignments feed the plan. */
export const PLAN_ASSIGNMENT_HORIZON_DAYS = 7;

export interface PlanTaskInput {
  id: string;
  title: string;
  priority: TaskPriority;
  dueAt: string | null;
  estimateMinutes: number | null;
  status: string;
}

export interface PlanAssignmentInput {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueAt: string;
}

export interface PlanEventInput {
  summary: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
}

export interface PlanItem {
  kind: "task" | "assignment";
  id: string;
  title: string;
  /** Human explanation of why this ranks here ("due in 5h", "High · overdue"). */
  reason: string;
  /** Estimated effort in minutes where known. */
  estimateMinutes: number | null;
  courseId: string | null;
}

export interface FreeWindow {
  startAt: string;
  endAt: string;
  minutes: number;
}

export interface DailyPlan {
  items: PlanItem[];
  /** Today's usable gaps (≥ MIN_FREE_WINDOW_MINUTES), soonest first. */
  freeWindows: FreeWindow[];
  plannedMinutes: number;
}

type PriorityWeight = Record<TaskPriority, number>;

const PRIORITY_WEIGHT: PriorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };
/** Deadlines are hard commitments — they rank like a priority just under urgent. */
const ASSIGNMENT_WEIGHT = 0.5;

interface ScoredEntry {
  item: PlanItem;
  tier: number;
  hoursUntil: number;
  weight: number;
  effort: number;
}

function dueLabel(dueMs: number, nowMs: number): string {
  const hoursUntil = (dueMs - nowMs) / HOUR_MS;
  if (hoursUntil < 0) {
    const hoursLate = Math.round(-hoursUntil);
    return hoursLate >= 48 ? `${Math.round(hoursLate / 24)}d overdue` : `${hoursLate}h overdue`;
  }
  if (hoursUntil <= 24) return `due in ${Math.max(1, Math.round(hoursUntil))}h`;
  return `due ${new Date(dueMs).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function tierFor(dueMs: number, nowMs: number): number {
  const hoursUntil = (dueMs - nowMs) / HOUR_MS;
  if (hoursUntil < 0) return 0;
  if (hoursUntil <= 24) return 1;
  if (hoursUntil <= 72) return 2;
  return 3;
}

function scoreTasks(tasks: PlanTaskInput[], nowMs: number): ScoredEntry[] {
  return tasks.map((t) => {
    const dueMs = t.dueAt ? new Date(t.dueAt).getTime() : null;
    const weight = PRIORITY_WEIGHT[t.priority];
    const urgent = t.priority === "urgent" || t.priority === "high";

    let reason: string;
    if (dueMs == null) {
      reason = urgent ? "high priority · no due date" : "no due date";
    } else {
      const dueText = dueLabel(dueMs, nowMs);
      reason = urgent ? `${t.priority === "urgent" ? "Urgent" : "High"} · ${dueText}` : dueText;
    }

    return {
      item: {
        kind: "task" as const,
        id: t.id,
        title: t.title,
        reason,
        estimateMinutes: t.estimateMinutes,
        courseId: null,
      },
      tier: dueMs == null ? 4 : tierFor(dueMs, nowMs),
      hoursUntil: dueMs == null ? 0 : (dueMs - nowMs) / HOUR_MS,
      weight,
      effort: t.estimateMinutes ?? 0,
    };
  });
}

function scoreAssignments(assignments: PlanAssignmentInput[], nowMs: number): ScoredEntry[] {
  return assignments.map((a) => {
    const dueMs = new Date(a.dueAt).getTime();
    return {
      item: {
        kind: "assignment" as const,
        id: a.id,
        title: `${a.title} (${a.courseName})`,
        reason: dueLabel(dueMs, nowMs),
        estimateMinutes: null,
        courseId: a.courseId,
      },
      tier: tierFor(dueMs, nowMs),
      hoursUntil: (dueMs - nowMs) / HOUR_MS,
      weight: ASSIGNMENT_WEIGHT,
      effort: 0,
    };
  });
}

/**
 * Compute today's free study windows: STUDY_DAY_START..STUDY_DAY_END minus
 * timed calendar events, clipped to what's still ahead of `now`. All-day
 * events are ignored (they rarely block a desk hour).
 */
export function computeFreeWindows(events: PlanEventInput[], now: Date): FreeWindow[] {
  const dayStart = new Date(now);
  dayStart.setHours(STUDY_DAY_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(STUDY_DAY_END_HOUR, 0, 0, 0);

  const busy: Array<{ start: number; end: number }> = [];
  for (const e of events) {
    if (e.allDay || e.startAt == null || e.endAt == null) continue;
    const start = new Date(e.startAt).getTime();
    const end = new Date(e.endAt).getTime();
    if (end <= start) continue;
    busy.push({ start, end });
  }
  busy.sort((a, b) => a.start - b.start);

  const windows: FreeWindow[] = [];
  let cursor = Math.max(dayStart.getTime(), now.getTime());
  const endMs = dayEnd.getTime();
  if (cursor >= endMs) return [];

  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start > cursor) {
      pushWindow(windows, cursor, Math.min(b.start, endMs));
    }
    cursor = Math.max(cursor, b.end);
    if (cursor >= endMs) break;
  }
  pushWindow(windows, cursor, endMs);

  return windows;
}

function pushWindow(windows: FreeWindow[], startMs: number, endMs: number): void {
  const minutes = Math.floor((endMs - startMs) / 60000);
  if (minutes < MIN_FREE_WINDOW_MINUTES) return;
  windows.push({
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    minutes,
  });
}

/**
 * Build the full daily plan. Items are ordered most-urgent-first; callers can
 * slice to show fewer. Assignments must already be filtered to unsubmitted
 * work inside the planning horizon.
 */
export function buildDailyPlan(
  tasks: PlanTaskInput[],
  assignments: PlanAssignmentInput[],
  events: PlanEventInput[],
  now: Date = new Date()
): DailyPlan {
  const nowMs = now.getTime();
  const entries = [...scoreTasks(tasks, nowMs), ...scoreAssignments(assignments, nowMs)];

  entries.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    // Within a tier: sooner deadline first, then priority, then effort.
    if (a.tier <= 3 && a.hoursUntil !== b.hoursUntil) return a.hoursUntil - b.hoursUntil;
    if (a.weight !== b.weight) return a.weight - b.weight;
    return a.effort - b.effort;
  });

  const plannedMinutes = entries.reduce((sum, e) => sum + (e.item.estimateMinutes ?? 0), 0);

  return {
    items: entries.map((e) => e.item),
    freeWindows: computeFreeWindows(events, now),
    plannedMinutes,
  };
}
