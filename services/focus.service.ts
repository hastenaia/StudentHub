import { createClient } from "@/lib/supabase/server";
import { computeStreak, reportingWindows } from "@/lib/dates";

export interface FocusStats {
  todayMinutes: number;
  todaySessions: number;
  weeklyMinutes: number;
  weeklySessions: number;
  monthlyMinutes: number;
  monthlySessions: number;
  streak: number;
  totalMinutes: number;
  totalSessions: number;
}

export async function getFocusStats(userId: string): Promise<FocusStats> {
  const supabase = await createClient();
  // 120-day window covers daily/weekly/monthly trends + streaks while bounding growth.
  const windowStart = new Date(Date.now() - 120 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("duration_minutes, started_at")
    .eq("user_id", userId)
    .gte("started_at", windowStart)
    .order("started_at", { ascending: false })
    .limit(2000);

  if (error || !data) {
    return {
      todayMinutes: 0,
      todaySessions: 0,
      weeklyMinutes: 0,
      weeklySessions: 0,
      monthlyMinutes: 0,
      monthlySessions: 0,
      streak: 0,
      totalMinutes: 0,
      totalSessions: 0,
    };
  }

  const { todayStart, weekStart, monthStart } = reportingWindows();

  let todayMinutes = 0;
  let todaySessions = 0;
  let weeklyMinutes = 0;
  let weeklySessions = 0;
  let monthlyMinutes = 0;
  let monthlySessions = 0;
  let totalMinutes = 0;

  for (const row of data) {
    const started = new Date(row.started_at);
    const mins = row.duration_minutes ?? 0;
    totalMinutes += mins;
    if (started >= todayStart) {
      todayMinutes += mins;
      todaySessions++;
    }
    if (started >= weekStart) {
      weeklyMinutes += mins;
      weeklySessions++;
    }
    if (started >= monthStart) {
      monthlyMinutes += mins;
      monthlySessions++;
    }
  }

  const streak = computeStreak(data.map((r) => r.started_at));

  return {
    todayMinutes,
    todaySessions,
    weeklyMinutes,
    weeklySessions,
    monthlyMinutes,
    monthlySessions,
    streak,
    totalMinutes,
    totalSessions: data.length,
  };
}
