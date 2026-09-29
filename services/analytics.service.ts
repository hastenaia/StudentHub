import { createClient } from "@/lib/supabase/server";
import { reportingWindows, startOfDay, toDateStr } from "@/lib/dates";

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

const WEEKDAY_LONG_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const WEEKDAY_SHORT_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short" });

type TaskRow = { status: string; due_at: string | null; completed_at: string | null };
type FocusRow = { duration_minutes: number; started_at: string };
type FlashcardRow = { last_reviewed: string | null };
type ScheduleRow = { event_type: string };
type WellnessRow = { entry_date: string; mood: number };

interface TaskSummary {
  completed: number;
  pending: number;
  overdue: number;
  total: number;
  completionRate: number;
  byStatus: { status: string; count: number }[];
  trendMap: Map<string, number>;
}

function summarizeTasks(rows: TaskRow[], todayStart: Date, nowMs: number): TaskSummary {
  let completed = 0;
  let todoCount = 0;
  let inProgressCount = 0;
  const trendMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    trendMap.set(toDateStr(d), 0);
  }
  let overdue = 0;
  for (const t of rows) {
    if (t.status === "done") {
      completed++;
      if (t.completed_at) {
        const dStr = toDateStr(new Date(t.completed_at));
        if (trendMap.has(dStr)) trendMap.set(dStr, (trendMap.get(dStr) ?? 0) + 1);
      }
    } else {
      if (t.status === "todo") todoCount++;
      else if (t.status === "in_progress") inProgressCount++;
      if (t.due_at && Date.parse(t.due_at) < nowMs) overdue++;
    }
  }
  const total = rows.length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    completed,
    pending,
    overdue,
    total,
    completionRate,
    byStatus: [
      { status: "TODO", count: todoCount },
      { status: "IN_PROGRESS", count: inProgressCount },
      { status: "COMPLETED", count: completed },
    ],
    trendMap,
  };
}

interface FocusSummary {
  dailyMinutes: number;
  dailySessions: number;
  weeklyMinutes: number;
  weeklySessions: number;
  monthlyMinutes: number;
  monthlySessions: number;
  averageMinutes: number;
  totalMinutes: number;
  prevWeekMins: number;
  dailyTrendMap: Map<string, number>;
  weeklyTrendMap: Map<string, number>;
  byWeekday: Map<string, number>;
}

function initTrendMaps(todayStart: Date): { daily: Map<string, number>; weekly: Map<string, number> } {
  const daily = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    daily.set(toDateStr(d), 0);
  }
  const weekly = new Map<string, number>();
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekly.set(`W${4 - i}`, 0);
  }
  return { daily, weekly };
}

function summarizeFocus(
  rows: FocusRow[],
  todayStart: Date,
  weekStart: Date,
  monthStart: Date
): FocusSummary {
  let dailyMinutes = 0, dailySessions = 0, weeklyMinutes = 0, weeklySessions = 0, monthlyMinutes = 0, monthlySessions = 0;
  const { daily: dailyTrendMap, weekly: weeklyTrendMap } = initTrendMaps(todayStart);

  let totalMinutes = 0;
  const byWeekday = new Map<string, number>();
  const todayStartMs = todayStart.getTime();
  const weekStartMs = weekStart.getTime();
  const monthStartMs = monthStart.getTime();
  const prevWeekStartMs = weekStartMs - 7 * 86400000;
  const prevWeekEndMs = weekStartMs - 1;
  let prevWeekMins = 0;

  for (const row of rows) {
    const startedMs = Date.parse(row.started_at);
    if (Number.isNaN(startedMs)) continue;
    const mins = row.duration_minutes ?? 0;
    totalMinutes += mins;
    const dateStr = row.started_at.slice(0, 10);
    if (dailyTrendMap.has(dateStr)) dailyTrendMap.set(dateStr, (dailyTrendMap.get(dateStr) ?? 0) + mins);
    // Compare day starts, not the raw timestamp: a session started today must be 0 days ago, not -1.
    // Math.round absorbs 23h/25h DST days between the two midnights.
    const diffDays = Math.round((todayStartMs - startOfDay(new Date(startedMs)).getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 28) {
      const weekLabel = `W${4 - Math.floor(diffDays / 7)}`;
      weeklyTrendMap.set(weekLabel, (weeklyTrendMap.get(weekLabel) ?? 0) + mins);
    }
    if (startedMs >= todayStartMs) { dailyMinutes += mins; dailySessions++; }
    if (startedMs >= weekStartMs) { weeklyMinutes += mins; weeklySessions++; }
    if (startedMs >= monthStartMs) { monthlyMinutes += mins; monthlySessions++; }
    if (startedMs >= prevWeekStartMs && startedMs <= prevWeekEndMs) prevWeekMins += mins;

    const weekday = WEEKDAY_LONG_FMT.format(new Date(startedMs));
    byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + mins);
  }

  return {
    dailyMinutes, dailySessions, weeklyMinutes, weeklySessions, monthlyMinutes, monthlySessions,
    averageMinutes: rows.length > 0 ? Math.round(totalMinutes / rows.length) : 0,
    totalMinutes, prevWeekMins, dailyTrendMap, weeklyTrendMap, byWeekday,
  };
}

function summarizeStudy(flashcards: FlashcardRow[], quizAttempts: unknown[], scheduleEvents: ScheduleRow[], notesCount: number) {
  let studied = 0;
  for (const f of flashcards) if (f.last_reviewed) studied++;
  let studySessions = 0;
  for (const e of scheduleEvents) if (e.event_type === "study_session") studySessions++;
  return { notesCreated: notesCount, flashcardsStudied: studied, flashcardsTotal: flashcards.length, quizzesCompleted: quizAttempts.length, studySessions };
}

function summarizeWellness(entries: WellnessRow[], todayStart: Date) {
  const byDate = new Map(entries.map((w) => [w.entry_date, w.mood]));
  const moodTrend: { date: string; label: string; mood: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const dateStr = toDateStr(d);
    moodTrend.push({ date: dateStr, label: WEEKDAY_SHORT_FMT.format(d), mood: (byDate.get(dateStr) as number | undefined) ?? null });
  }
  let moodSum = 0;
  for (const w of entries) moodSum += w.mood as number;
  return {
    moodTrend,
    checkIns: entries.length,
    avgMood: entries.length > 0 ? parseFloat((moodSum / entries.length).toFixed(1)) : null,
  };
}

function buildInsights(input: {
  taskTrend: { date: string; label: string; count: number }[];
  mostProductiveDay: string | null;
  weeklyMinutes: number;
  prevWeekMins: number;
  completionRate: number;
  totalTasks: number;
  overdue: number;
  avgMood: number | null;
}): string[] {
  const insights: string[] = [];
  const weekTasksCompleted = input.taskTrend.reduce((sum, d) => sum + d.count, 0);
  insights.push(`You completed ${weekTasksCompleted} task${weekTasksCompleted === 1 ? "" : "s"} this week.`);
  if (input.mostProductiveDay) {
    insights.push(`Your most productive day was ${input.mostProductiveDay}.`);
  } else {
    insights.push(`No focus day stands out yet — try a short session today.`);
  }
  const diff = input.weeklyMinutes - input.prevWeekMins;
  if (diff > 0) {
    insights.push(`You focused ${diff} minutes more than last week.`);
  } else if (diff < 0) {
    insights.push(`You focused ${Math.abs(diff)} minutes less than last week. A small block today helps.`);
  } else if (input.weeklyMinutes > 0) {
    insights.push(`Your focus time matched last week — nice consistency.`);
  }
  if (input.completionRate >= 75 && input.totalTasks > 0) {
    insights.push(`Strong completion rate at ${input.completionRate}% — keep finishing what you start.`);
  } else if (input.overdue > 0) {
    insights.push(`You have ${input.overdue} overdue task${input.overdue === 1 ? "" : "s"} — consider rescheduling or breaking them down.`);
  }
  if (input.avgMood !== null) {
    insights.push(`Your average mood this period is ${input.avgMood}/5.`);
  }
  return insights;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchAnalyticsRows(supabase: ServerClient, userId: string, windowStart: string, windowDateStart: string) {
  return Promise.all([
    supabase.from("tasks").select("id, status, due_at, completed_at, created_at").eq("user_id", userId).limit(2000),
    supabase.from("focus_sessions").select("duration_minutes, started_at").eq("user_id", userId).gte("started_at", windowStart).order("started_at", { ascending: false }).limit(2000),
    supabase.from("notes").select("id, created_at").eq("user_id", userId).gte("created_at", windowStart).limit(2000),
    supabase.from("flashcards").select("id, last_reviewed, is_known").eq("user_id", userId).limit(2000),
    supabase.from("quiz_attempts").select("id, created_at").eq("user_id", userId).gte("created_at", windowStart).limit(2000),
    supabase.from("schedule_events").select("id, event_type, start_at").eq("user_id", userId).gte("start_at", windowStart).limit(2000),
    supabase.from("wellness_entries").select("entry_date, mood").eq("user_id", userId).gte("entry_date", windowDateStart).order("entry_date", { ascending: true }).limit(90),
  ]);
}

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  const supabase = await createClient();
  const now = new Date();
  const { todayStart, weekStart, monthStart } = reportingWindows(now);

  const windowStart = new Date(todayStart.getTime() - 60 * 86400000).toISOString();

  const [tasksRes, focusRes, notesRes, flashcardsRes, quizAttemptsRes, scheduleRes, wellnessRes] =
    await fetchAnalyticsRows(supabase, userId, windowStart, windowStart.slice(0, 10));

  const tasks = summarizeTasks((tasksRes.data ?? []) as TaskRow[], todayStart, now.getTime());
  const focus = summarizeFocus((focusRes.data ?? []) as FocusRow[], todayStart, weekStart, monthStart);

  const dailyTrend = Array.from(focus.dailyTrendMap.entries()).map(([date, minutes]) => ({
    date,
    label: WEEKDAY_SHORT_FMT.format(new Date(`${date}T12:00:00`)),
    minutes,
  }));
  const weeklyTrend = Array.from(focus.weeklyTrendMap.entries()).map(([week, minutes]) => ({ week, minutes }));

  const study = summarizeStudy(
    (flashcardsRes.data ?? []) as FlashcardRow[],
    quizAttemptsRes.data ?? [],
    (scheduleRes.data ?? []) as ScheduleRow[],
    (notesRes.data ?? []).length
  );

  let mostProductiveDay: string | null = null;
  let mostProductiveMinutes = 0;
  for (const [day, mins] of focus.byWeekday.entries()) {
    if (mins > mostProductiveMinutes) {
      mostProductiveMinutes = mins;
      mostProductiveDay = day;
    }
  }
  const taskTrend = Array.from(tasks.trendMap.entries()).map(([date, count]) => ({
    date,
    label: WEEKDAY_SHORT_FMT.format(new Date(`${date}T12:00:00`)),
    count,
  }));

  const wellness = summarizeWellness((wellnessRes.data ?? []) as WellnessRow[], todayStart);

  const insights = buildInsights({
    taskTrend,
    mostProductiveDay,
    weeklyMinutes: focus.weeklyMinutes,
    prevWeekMins: focus.prevWeekMins,
    completionRate: tasks.completionRate,
    totalTasks: tasks.total,
    overdue: tasks.overdue,
    avgMood: wellness.avgMood,
  });

  return {
    tasks: { completed: tasks.completed, pending: tasks.pending, overdue: tasks.overdue, total: tasks.total, completionRate: tasks.completionRate, byStatus: tasks.byStatus },
    focus: { dailyMinutes: focus.dailyMinutes, dailySessions: focus.dailySessions, weeklyMinutes: focus.weeklyMinutes, weeklySessions: focus.weeklySessions, monthlyMinutes: focus.monthlyMinutes, monthlySessions: focus.monthlySessions, averageMinutes: focus.averageMinutes, dailyTrend, weeklyTrend },
    study,
    productivity: { mostProductiveDay, mostProductiveMinutes, taskTrend, averageFocusSession: focus.averageMinutes },
    wellness: { avgMood: wellness.avgMood, moodTrend: wellness.moodTrend, checkIns: wellness.checkIns },
    insights,
  };
}
