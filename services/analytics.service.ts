import { createClient } from "@/lib/supabase/server";

export interface AnalyticsData {
  tasks: {
    completed: number;
    pending: number;
    overdue: number;
    total: number;
    completionRate: number;
    byStatus: { status: string; count: number }[];
  };
  focus: {
    dailyMinutes: number;
    dailySessions: number;
    weeklyMinutes: number;
    weeklySessions: number;
    monthlyMinutes: number;
    monthlySessions: number;
    averageMinutes: number;
    dailyTrend: { date: string; label: string; minutes: number }[];
    weeklyTrend: { week: string; minutes: number }[];
  };
  study: {
    notesCreated: number;
    flashcardsStudied: number;
    flashcardsTotal: number;
    quizzesCompleted: number;
    studySessions: number;
  };
  productivity: {
    mostProductiveDay: string | null;
    mostProductiveMinutes: number;
    taskTrend: { date: string; label: string; count: number }[];
    averageFocusSession: number;
  };
  wellness: {
    avgMood: number | null;
    moodTrend: { date: string; label: string; mood: number | null }[];
    checkIns: number;
  };
  insights: string[];
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [tasksRes, focusRes, notesRes, flashcardsRes, quizAttemptsRes, scheduleRes, wellnessRes] = await Promise.all([
    supabase.from("tasks").select("id, status, due_at, completed_at, created_at").eq("user_id", userId),
    supabase.from("focus_sessions").select("duration_minutes, started_at").eq("user_id", userId),
    supabase.from("notes").select("id, created_at").eq("user_id", userId),
    supabase.from("flashcards").select("id, last_reviewed, is_known").eq("user_id", userId),
    supabase.from("quiz_attempts").select("id, created_at").eq("user_id", userId),
    supabase.from("schedule_events").select("id, event_type, start_at").eq("user_id", userId),
    supabase.from("wellness_entries").select("entry_date, mood").eq("user_id", userId).order("entry_date", { ascending: true }),
  ]);

  const tasks = tasksRes.data ?? [];
  const focusSessions = focusRes.data ?? [];
  const notes = notesRes.data ?? [];
  const flashcards = flashcardsRes.data ?? [];
  const quizAttempts = quizAttemptsRes.data ?? [];
  const scheduleEvents = scheduleRes.data ?? [];
  const wellnessEntries = wellnessRes.data ?? [];

  // TASKS
  const completed = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status !== "done").length;
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_at && new Date(t.due_at).getTime() < now.getTime()).length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const byStatus = [
    { status: "TODO", count: tasks.filter((t) => t.status === "todo").length },
    { status: "IN_PROGRESS", count: tasks.filter((t) => t.status === "in_progress").length },
    { status: "COMPLETED", count: completed },
  ];

  // FOCUS - daily/weekly/monthly
  let dailyMinutes = 0, dailySessions = 0, weeklyMinutes = 0, weeklySessions = 0, monthlyMinutes = 0, monthlySessions = 0;
  const dailyTrendMap = new Map<string, number>();
  const weeklyTrendMap = new Map<string, number>();
  // init daily trend last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    dailyTrendMap.set(toDateStr(d), 0);
  }
  // init weekly trend last 4 weeks
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekLabel = `W${4 - i}`;
    weeklyTrendMap.set(weekLabel, 0);
  }

  let totalFocusMinutes = 0;
  const focusByDay = new Map<string, number>(); // for most productive day

  for (const row of focusSessions) {
    const started = new Date(row.started_at);
    const mins = row.duration_minutes ?? 0;
    totalFocusMinutes += mins;
    const dateStr = toDateStr(started);
    // daily trend
    if (dailyTrendMap.has(dateStr)) dailyTrendMap.set(dateStr, (dailyTrendMap.get(dateStr) ?? 0) + mins);
    // weekly trend - bucket by weeks
    const diffDays = Math.floor((todayStart.getTime() - startOfDay(started).getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < 28) {
      const weekIdx = Math.floor(diffDays / 7);
      const weekLabel = `W${4 - weekIdx}`;
      weeklyTrendMap.set(weekLabel, (weeklyTrendMap.get(weekLabel) ?? 0) + mins);
    }
    if (started >= todayStart) { dailyMinutes += mins; dailySessions++; }
    if (started >= weekStart) { weeklyMinutes += mins; weeklySessions++; }
    if (started >= monthStart) { monthlyMinutes += mins; monthlySessions++; }

    // for most productive day (weekday)
    const weekday = started.toLocaleDateString("en-US", { weekday: "long" });
    focusByDay.set(weekday, (focusByDay.get(weekday) ?? 0) + mins);
  }

  const averageMinutes = focusSessions.length > 0 ? Math.round(totalFocusMinutes / focusSessions.length) : 0;

  const dailyTrend = Array.from(dailyTrendMap.entries()).map(([date, minutes]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
    minutes,
  }));

  const weeklyTrend = Array.from(weeklyTrendMap.entries()).map(([week, minutes]) => ({ week, minutes }));

  // STUDY
  const notesCreated = notes.length;
  const flashcardsTotal = flashcards.length;
  const flashcardsStudied = flashcards.filter((f) => f.last_reviewed).length;
  const quizzesCompleted = quizAttempts.length;
  const studySessions = scheduleEvents.filter((e) => e.event_type === "study_session").length;

  // PRODUCTIVITY
  let mostProductiveDay: string | null = null;
  let mostProductiveMinutes = 0;
  for (const [day, mins] of focusByDay.entries()) {
    if (mins > mostProductiveMinutes) {
      mostProductiveMinutes = mins;
      mostProductiveDay = day;
    }
  }
  // task completion trend last 7 days
  const taskTrendMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    taskTrendMap.set(toDateStr(d), 0);
  }
  for (const t of tasks) {
    if (t.status === "done" && t.completed_at) {
      const dStr = toDateStr(new Date(t.completed_at));
      if (taskTrendMap.has(dStr)) taskTrendMap.set(dStr, (taskTrendMap.get(dStr) ?? 0) + 1);
    }
  }
  const taskTrend = Array.from(taskTrendMap.entries()).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
    count,
  }));

  const averageFocusSession = averageMinutes;

  // WELLNESS
  const wellnessByDate = new Map(wellnessEntries.map((w) => [w.entry_date, w.mood]));
  const moodTrend: { date: string; label: string; mood: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const dateStr = toDateStr(d);
    moodTrend.push({
      date: dateStr,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      mood: (wellnessByDate.get(dateStr) as number | undefined) ?? null,
    });
  }
  const avgMood = wellnessEntries.length > 0 ? parseFloat((wellnessEntries.reduce((sum, w) => sum + (w.mood as number), 0) / wellnessEntries.length).toFixed(1)) : null;

  // INSIGHTS - dynamic, no hardcode
  const insights: string[] = [];
  const weekTasksCompleted = taskTrend.reduce((sum, d) => sum + d.count, 0);
  insights.push(`You completed ${weekTasksCompleted} task${weekTasksCompleted === 1 ? "" : "s"} this week.`);
  if (mostProductiveDay) {
    insights.push(`Your most productive day was ${mostProductiveDay}.`);
  } else {
    insights.push(`No focus day stands out yet — try a short session today.`);
  }
  // compare weekly focus vs previous week
  const thisWeekMins = weeklyMinutes;
  // previous week = weekStart -7 to weekStart -1
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(weekStart.getDate() - 1);
  let prevWeekMins = 0;
  for (const row of focusSessions) {
    const d = new Date(row.started_at);
    if (d >= prevWeekStart && d <= prevWeekEnd) prevWeekMins += row.duration_minutes ?? 0;
  }
  const diff = thisWeekMins - prevWeekMins;
  if (diff > 0) {
    insights.push(`You focused ${diff} minutes more than last week.`);
  } else if (diff < 0) {
    insights.push(`You focused ${Math.abs(diff)} minutes less than last week. A small block today helps.`);
  } else if (thisWeekMins > 0) {
    insights.push(`Your focus time matched last week — nice consistency.`);
  }
  if (completionRate >= 75 && total > 0) {
    insights.push(`Strong completion rate at ${completionRate}% — keep finishing what you start.`);
  } else if (overdue > 0) {
    insights.push(`You have ${overdue} overdue task${overdue === 1 ? "" : "s"} — consider rescheduling or breaking them down.`);
  }
  if (avgMood !== null) {
    insights.push(`Your average mood this period is ${avgMood}/5.`);
  }

  return {
    tasks: { completed, pending, overdue, total, completionRate, byStatus },
    focus: { dailyMinutes, dailySessions, weeklyMinutes, weeklySessions, monthlyMinutes, monthlySessions, averageMinutes, dailyTrend, weeklyTrend },
    study: { notesCreated, flashcardsStudied, flashcardsTotal, quizzesCompleted, studySessions },
    productivity: { mostProductiveDay, mostProductiveMinutes, taskTrend, averageFocusSession },
    wellness: { avgMood, moodTrend, checkIns: wellnessEntries.length },
    insights,
  };
}
