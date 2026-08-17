import type { RecurrenceFreq, TaskPriority } from "@/types/tasks";

/**
 * Pure scheduling + recurrence math for the Smart To-Do Tracker.
 *
 * `buildSchedule` is the "AI min-heap": it pushes every actionable task into a
 * real binary min-heap and pops them in priority order. The ordering is driven
 * by a weighted score — overdue first (most-overdue first), then due
 * proximity, then priority, then effort — so it's deterministic, offline and
 * unit-testable. Each popped item carries a human-readable `reason`.
 */

export interface ScheduleInput {
  id: string;
  title: string;
  priority: TaskPriority;
  dueAt: string | null;
  estimateMinutes: number | null;
}

export interface ScheduledItem {
  taskId: string;
  title: string;
  reason: string;
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

type ScheduleKey = [number, number, number, number];

/** Lower key = higher priority. Tier, then urgency, then priority, then effort. */
function scheduleKey(input: ScheduleInput, nowMs: number): ScheduleKey {
  const priority = PRIORITY_WEIGHT[input.priority];
  const effort = input.estimateMinutes ?? 0;
  const dueMs = input.dueAt ? new Date(input.dueAt).getTime() : null;

  if (dueMs == null) {
    // No due date — sits after everything dated, ordered by priority/effort.
    return [3, 0, priority, effort];
  }

  const hoursUntil = (dueMs - nowMs) / HOUR_MS;
  if (hoursUntil < 0) return [0, hoursUntil, priority, effort]; // most-overdue first
  if (hoursUntil <= 24) return [1, hoursUntil, priority, effort]; // due today
  return [2, hoursUntil, priority, effort]; // due later
}

function reasonFor(input: ScheduleInput, nowMs: number): string {
  const dueMs = input.dueAt ? new Date(input.dueAt).getTime() : null;

  let dueText: string;
  if (dueMs == null) {
    dueText = "no due date";
  } else {
    const hoursUntil = (dueMs - nowMs) / HOUR_MS;
    if (hoursUntil < 0) {
      const hoursLate = Math.round(-hoursUntil);
      dueText =
        hoursLate >= 48 ? `${Math.round(hoursLate / 24)}d overdue` : `${hoursLate}h overdue`;
    } else if (hoursUntil <= 24) {
      const hours = Math.max(1, Math.round(hoursUntil));
      dueText = `due in ${hours}h`;
    } else {
      dueText = `due ${new Date(dueMs).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
  }

  const urgent = input.priority === "urgent" || input.priority === "high";
  return urgent ? `${PRIORITY_LABEL[input.priority]} · ${dueText}` : dueText;
}

/** Minimal binary min-heap. */
class BinaryMinHeap<T> {
  private items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parent]) >= 0) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const size = this.items.length;
    while (true) {
      const left = 2 * index + 1;
      const right = left + 1;
      let smallest = index;
      if (left < size && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left;
      if (right < size && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right;
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

/**
 * Order tasks into the recommended execution sequence. Input order is
 * irrelevant; the result is fully determined by the scored min-heap.
 */
export function buildSchedule(tasks: ScheduleInput[], now: Date = new Date()): ScheduledItem[] {
  const nowMs = now.getTime();
  const heap = new BinaryMinHeap<ScheduleInput>((a, b) => {
    const ka = scheduleKey(a, nowMs);
    const kb = scheduleKey(b, nowMs);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });

  for (const task of tasks) heap.push(task);

  const ordered: ScheduledItem[] = [];
  while (heap.size > 0) {
    const task = heap.pop()!;
    ordered.push({ taskId: task.id, title: task.title, reason: reasonFor(task, nowMs) });
  }
  return ordered;
}

/**
 * Advance a recurring task's due date after completion. The next instance is
 * always strictly after both `now` and the current due date, so completing an
 * overdue recurring task re-bases from today rather than drifting into the
 * past. Returns null when the task has no base due date or the next instance
 * falls after `recurUntil` (the recurrence has ended — the task just closes).
 */
export function nextRecurrence(
  baseDueAt: string | null,
  freq: RecurrenceFreq,
  interval: number,
  recurUntil: string | null,
  now: Date = new Date()
): string | null {
  if (baseDueAt == null) return null;

  const baseMs = Math.max(new Date(baseDueAt).getTime(), now.getTime());
  const next = advanceFrequency(new Date(baseMs), freq, interval);

  if (recurUntil != null && next.getTime() > new Date(recurUntil).getTime()) return null;
  return next.toISOString();
}

function advanceFrequency(base: Date, freq: RecurrenceFreq, interval: number): Date {
  switch (freq) {
    case "daily":
      return new Date(base.getTime() + interval * DAY_MS);
    case "weekly":
      return new Date(base.getTime() + interval * 7 * DAY_MS);
    case "monthly": {
      const year = base.getUTCFullYear();
      const month = base.getUTCMonth();
      const day = base.getUTCDate();
      const next = new Date(
        Date.UTC(
          year,
          month + interval,
          1,
          base.getUTCHours(),
          base.getUTCMinutes(),
          base.getUTCSeconds(),
          base.getUTCMilliseconds()
        )
      );
      // Clamp to the target month's last day (Jan 31 -> Feb 28/29).
      const daysInTarget = new Date(Date.UTC(year, month + interval + 1, 0)).getUTCDate();
      next.setUTCDate(Math.min(day, daysInTarget));
      return next;
    }
  }
}

/** Human label for a recurrence rule ("Every week", "Every 2 months"). */
export function formatRecurrenceLabel(freq: RecurrenceFreq | null, interval: number): string {
  if (!freq) return "Does not repeat";
  const noun: Record<RecurrenceFreq, string> = { daily: "day", weekly: "week", monthly: "month" };
  return interval === 1 ? `Every ${noun[freq]}` : `Every ${interval} ${noun[freq]}s`;
}
