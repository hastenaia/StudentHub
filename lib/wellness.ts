import { toDateStr } from "@/lib/dates";
import type { WellnessEntry, WeeklyMoodPoint, WorkloadInfo } from "@/types/wellness";

// Pure workload/mood assembly for the Wellness page (services/wellness.service.ts does the I/O).

const WEEK_MS = 7 * 86400000;

/** The last 7 days (oldest first, today last) with the logged mood or null. */
export function buildWeeklyMood(history: Pick<WellnessEntry, "entryDate" | "mood">[], now: Date = new Date()): WeeklyMoodPoint[] {
  const moodByDate = new Map(history.map((h) => [h.entryDate, h.mood]));
  const points: WeeklyMoodPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = toDateStr(d);
    points.push({ date, mood: moodByDate.get(date) ?? null, label: d.toLocaleDateString("en-US", { weekday: "short" }) });
  }
  return points;
}

const isOn = (iso: string | null | undefined, day: string) => !!iso && iso.slice(0, 10) === day;

type Activity = {
  focus: { started_at: string; duration_minutes: number | null }[];
  tasks: { status: string; completed_at: string | null }[];
  schedule: { event_type: string; start_at: string }[];
  assignments: { due_at: string | null }[];
};

/** Today's activity counts plus deadlines due within the next 7 days. */
export function summarizeActivity(activity: Activity, now: Date = new Date()): Omit<WorkloadInfo, "suggestion"> {
  const today = toDateStr(now);
  const focusToday = activity.focus.filter((r) => isOn(r.started_at, today));
  const nowMs = now.getTime();
  return {
    focusMinutesToday: focusToday.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0),
    focusSessionsToday: focusToday.length,
    completedTasksToday: activity.tasks.filter((t) => t.status === "done" && isOn(t.completed_at, today)).length,
    studySessionsToday: activity.schedule.filter((e) => e.event_type === "study_session" && isOn(e.start_at, today)).length,
    upcomingDeadlinesCount: activity.assignments.filter((a) => {
      const dueMs = a.due_at ? Date.parse(a.due_at) : NaN;
      return dueMs >= nowMs && dueMs - nowMs < WEEK_MS;
    }).length,
  };
}

/** Gentle, non-medical suggestion; the first matching rule wins. */
export function workloadSuggestion({ focusMinutesToday: focus, upcomingDeadlinesCount: deadlines, completedTasksToday: done }: Omit<WorkloadInfo, "suggestion">): string {
  if (focus >= 180) return `You have completed ${Math.round(focus / 60)} hours of focus sessions today. Consider taking a break and stretching.`;
  if (focus >= 90) return `Nice work — ${focus} minutes of focus today. A short break could help you recharge.`;
  if (focus > 0) return `You have focused for ${focus} minutes today. Keep the momentum going!`;
  if (deadlines > 3) return `You have ${deadlines} deadlines coming up this week. Consider planning short focus blocks.`;
  if (done > 0) return `You completed ${done} task${done === 1 ? "" : "s"} today. Great consistency!`;
  return "No focus sessions yet today. A 25-minute focus block is a great way to start.";
}
