import { createClient } from "@/lib/supabase/server";

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const uniq = Array.from(new Set(dates.map((s) => s.slice(0, 10)))).sort();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;
  const set = new Set(uniq);
  while (set.has(cursor)) {
    streak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

export async function getFocusStats(userId: string): Promise<FocusStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("duration_minutes, started_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

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

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6); // last 7 days
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
