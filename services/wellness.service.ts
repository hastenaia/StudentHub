import { createClient } from "@/lib/supabase/server";
import type { WellnessEntry, WeeklyMoodPoint, WorkloadInfo } from "@/types/wellness";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getWellnessData(userId: string): Promise<{
  todayEntry: WellnessEntry | null;
  history: WellnessEntry[];
  weeklyMood: WeeklyMoodPoint[];
  workload: WorkloadInfo;
}> {
  const supabase = await createClient();
  const todayStr = toDateStr(new Date());
  const weekAgoIso = new Date(Date.now() - 8 * 86400000).toISOString();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [historyRes, focusRes, tasksRes, scheduleRes, assignmentsRes] = await Promise.all([
    supabase.from("wellness_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(30),
    supabase.from("focus_sessions").select("duration_minutes, started_at").eq("user_id", userId).gte("started_at", weekAgoIso).limit(500),
    supabase.from("tasks").select("id, status, completed_at, created_at").eq("user_id", userId).limit(1000),
    supabase.from("schedule_events").select("id, event_type, start_at").eq("user_id", userId).gte("start_at", weekAgoIso).limit(500),
    supabase.from("assignments").select("id, due_at").eq("user_id", userId).gte("due_at", todayIso).order("due_at").limit(200),
  ]);

  const history: WellnessEntry[] = (historyRes.data ?? []).map((row) => ({
    id: row.id,
    entryDate: row.entry_date,
    mood: row.mood as WellnessEntry["mood"],
    journal: row.journal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const todayEntry = history.find((e) => e.entryDate === todayStr) ?? null;

  // Weekly mood visualization: last 7 days including today
  const weeklyMood: WeeklyMoodPoint[] = [];
  const historyMap = new Map(history.map((h) => [h.entryDate, h.mood]));
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toDateStr(d);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    weeklyMood.push({ date: dateStr, mood: (historyMap.get(dateStr) as WeeklyMoodPoint["mood"]) ?? null, label });
  }

  // Workload based on actual activity — single pass each, ISO-slice compare
  let focusMinutesToday = 0;
  let focusSessionsToday = 0;
  for (const r of (focusRes.data ?? []) as { started_at: string; duration_minutes: number }[]) {
    if ((r.started_at as string).slice(0, 10) === todayStr) {
      focusMinutesToday += r.duration_minutes ?? 0;
      focusSessionsToday++;
    }
  }

  let completedTasksToday = 0;
  for (const t of (tasksRes.data ?? []) as { status: string; completed_at: string | null }[]) {
    if (t.status === "done" && t.completed_at && (t.completed_at as string).slice(0, 10) === todayStr) completedTasksToday++;
  }

  let studySessionsToday = 0;
  for (const e of (scheduleRes.data ?? []) as { event_type: string; start_at: string }[]) {
    if (e.event_type === "study_session" && (e.start_at as string).slice(0, 10) === todayStr) studySessionsToday++;
  }

  const nowMs = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let upcomingDeadlinesCount = 0;
  for (const a of (assignmentsRes.data ?? []) as { due_at: string | null }[]) {
    if (!a.due_at) continue;
    const dueMs = Date.parse(a.due_at);
    if (Number.isNaN(dueMs)) continue;
    if (dueMs >= nowMs && dueMs - nowMs < weekMs) upcomingDeadlinesCount++;
  }

  // Gentle, non-medical workload suggestion
  let suggestion = "";
  if (focusMinutesToday >= 180) {
    suggestion = `You have completed ${Math.round(focusMinutesToday / 60)} hours of focus sessions today. Consider taking a break and stretching.`;
  } else if (focusMinutesToday >= 90) {
    suggestion = `Nice work — ${focusMinutesToday} minutes of focus today. A short break could help you recharge.`;
  } else if (focusMinutesToday > 0) {
    suggestion = `You have focused for ${focusMinutesToday} minutes today. Keep the momentum going!`;
  } else if (upcomingDeadlinesCount > 3) {
    suggestion = `You have ${upcomingDeadlinesCount} deadlines coming up this week. Consider planning short focus blocks.`;
  } else if (completedTasksToday > 0) {
    suggestion = `You completed ${completedTasksToday} task${completedTasksToday === 1 ? "" : "s"} today. Great consistency!`;
  } else {
    suggestion = "No focus sessions yet today. A 25-minute focus block is a great way to start.";
  }

  const workload: WorkloadInfo = {
    focusMinutesToday,
    focusSessionsToday,
    completedTasksToday,
    studySessionsToday,
    upcomingDeadlinesCount,
    suggestion,
  };

  return { todayEntry, history, weeklyMood, workload };
}
