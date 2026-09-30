import { createClient } from "@/lib/supabase/server";
import type { WellnessEntry, WeeklyMoodPoint, WorkloadInfo } from "@/types/wellness";
import { toDateStr } from "@/lib/dates";
import { buildWeeklyMood, summarizeActivity, workloadSuggestion } from "@/lib/wellness";

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
  const weeklyMood = buildWeeklyMood(history);

  const activity = summarizeActivity({
    focus: focusRes.data ?? [],
    tasks: tasksRes.data ?? [],
    schedule: scheduleRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
  });
  const workload: WorkloadInfo = { ...activity, suggestion: workloadSuggestion(activity) };

  return { todayEntry, history, weeklyMood, workload };
}
