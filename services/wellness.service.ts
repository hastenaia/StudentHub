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

  const [historyRes, focusRes, tasksRes, scheduleRes, assignmentsRes] = await Promise.all([
    supabase.from("wellness_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(30),
    supabase.from("focus_sessions").select("duration_minutes, started_at").eq("user_id", userId),
    supabase.from("tasks").select("id, status, completed_at, created_at").eq("user_id", userId),
    supabase.from("schedule_events").select("id, event_type, start_at").eq("user_id", userId),
    supabase.from("assignments").select("id, due_at").eq("user_id", userId).not("due_at", "is", null),
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

  // Workload based on actual activity
  const todayFocusRows = (focusRes.data ?? []).filter((r: { started_at: string }) => toDateStr(new Date(r.started_at)) === todayStr);
  const focusMinutesToday = todayFocusRows.reduce((sum: number, r: { duration_minutes: number }) => sum + (r.duration_minutes ?? 0), 0);
  const focusSessionsToday = todayFocusRows.length;

  const completedTasksToday = (tasksRes.data ?? []).filter((t: { status: string; completed_at: string | null }) => {
    if (t.status !== "done" || !t.completed_at) return false;
    return toDateStr(new Date(t.completed_at)) === todayStr;
  }).length;

  const studySessionsToday = (scheduleRes.data ?? []).filter(
    (e: { event_type: string; start_at: string }) => e.event_type === "study_session" && toDateStr(new Date(e.start_at)) === todayStr
  ).length;

  const upcomingDeadlinesCount = (assignmentsRes.data ?? []).filter((a: { due_at: string | null }) => {
    if (!a.due_at) return false;
    const due = new Date(a.due_at);
    const now = new Date();
    const inFuture = due.getTime() >= now.getTime();
    const withinWeek = due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
    return inFuture && withinWeek;
  }).length;

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
