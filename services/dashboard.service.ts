import { createClient } from "@/lib/supabase/server";
import { buildSchedule } from "@/lib/scheduling";
import { taskRowToView } from "@/lib/taskView";
import { scheduleRowToView, calendarRowToView } from "@/lib/scheduleView";
import type { Task } from "@/types/tasks";

export interface DashboardFocus {
  minutes: number;
  sessions: number;
  streak: number;
}

export interface DashboardActivity {
  completedTasks: number;
  studySessions: number;
  notesCreated: number;
}

export interface DashboardRecommendation {
  task: Task | null;
  reason: string;
  estimateLabel: string | null;
}

export interface TodayScheduleItem {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  eventType: string;
  source: "user" | "google";
  courseName: string | null;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  courseName: string | null;
  dueAt: string;
  kind: "task" | "assignment" | "event";
  priority?: string;
  estimateMinutes?: number | null;
}

export interface ProductivityDashboardData {
  todaySchedule: TodayScheduleItem[];
  priorityTasks: Task[];
  upcomingDeadlines: UpcomingDeadline[];
  focus: DashboardFocus;
  activity: DashboardActivity;
  recommendation: DashboardRecommendation;
  announcements: { id: string; text: string; courseName: string; creatorName: string | null; publishTime: string | null }[];
  courses: { id: string; name: string; color: string | null }[];
  coursesCount: number;
  tasksCount: number;
  googleLinked: boolean;
  stale: boolean;
  lastSyncedAt: string | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
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
  // If today has no activity but yesterday does, show yesterday's streak? Spec says current streak -> today inclusive
  return streak;
}

export async function getProductivityDashboardData(userId: string): Promise<ProductivityDashboardData> {
  const supabase = await createClient();

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const nowIso = today.toISOString();

  const [scheduleRes, calendarRes, tasksRes, coursesRes, assignmentsRes, announcementsRes, focusRes, notesRes, googleAccountRes] =
    await Promise.all([
      supabase.from("schedule_events").select("*").eq("user_id", userId).gte("start_at", todayStart).lte("start_at", todayEnd).order("start_at"),
      supabase.from("calendar_events").select("*").eq("user_id", userId).gte("start_at", todayStart).lte("start_at", todayEnd).order("start_at"),
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false),
      supabase.from("assignments").select("*").eq("user_id", userId).order("due_at"),
      supabase.from("announcements").select("*").eq("user_id", userId).order("publish_time", { ascending: false }).limit(6),
      supabase.from("focus_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("notes").select("id, created_at").eq("user_id", userId),
      supabase.from("google_accounts").select("last_synced_at, needs_reconnect").eq("user_id", userId).maybeSingle(),
    ]);

  const courses = (coursesRes.data ?? []).map((c: { id: string; name: string; course_name: string | null; color: string | null }) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  // Today's schedule: merge schedule_events + calendar_events for today
  const userToday: TodayScheduleItem[] = (scheduleRes.data ?? []).map((row) => {
    const v = scheduleRowToView(row as never, courseMap as never);
    return {
      id: v.id,
      title: v.title,
      startAt: v.startAt,
      endAt: v.endAt,
      allDay: v.allDay,
      location: v.location,
      eventType: v.eventType,
      source: "user" as const,
      courseName: v.courseName,
    };
  });
  const googleToday: TodayScheduleItem[] = (calendarRes.data ?? []).map((row) => {
    const v = calendarRowToView(row as never);
    return {
      id: v.id,
      title: v.title,
      startAt: v.startAt,
      endAt: v.endAt,
      allDay: v.allDay,
      location: v.location,
      eventType: "other",
      source: "google" as const,
      courseName: null,
    };
  });
  const todaySchedule = [...userToday, ...googleToday].sort(
    (a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime()
  );

  // Tasks
  const taskRows = tasksRes.data ?? [];
  const tasks: Task[] = taskRows.map((row) => taskRowToView(row as never, courseMap as unknown as Map<string, { id: string; name: string; color: string | null }>));

  // Priority tasks via smart algorithm (top 3-5 unfinished)
  const unfinished = tasks.filter((t) => t.status !== "done");
  const schedule = buildSchedule(
    unfinished.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, estimateMinutes: t.estimateMinutes }))
  );
  const priorityTaskIds = new Set(schedule.slice(0, 5).map((s) => s.taskId));
  const priorityTasks = unfinished.filter((t) => priorityTaskIds.has(t.id));

  // Upcoming deadlines: tasks + assignments + future schedule events (exam/assignment types)
  const upcomingDeadlines: UpcomingDeadline[] = [];

  for (const t of unfinished) {
    if (t.dueAt) {
      upcomingDeadlines.push({
        id: t.id,
        title: t.title,
        courseName: t.courseName,
        dueAt: t.dueAt,
        kind: "task",
        priority: t.priority,
        estimateMinutes: t.estimateMinutes,
      });
    }
  }
  for (const a of assignmentsRes.data ?? []) {
    if (a.due_at && new Date(a.due_at).getTime() >= new Date(nowIso).getTime() - 24 * 60 * 60 * 1000) {
      const cname = courseMap.get(a.course_id)?.name ?? "Unknown course";
      upcomingDeadlines.push({
        id: a.id,
        title: a.title,
        courseName: cname,
        dueAt: a.due_at,
        kind: "assignment",
      });
    }
  }
  // Future schedule events that are deadline-like
  const futureSchedule = await supabase
    .from("schedule_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_at", nowIso)
    .in("event_type", ["assignment", "exam"])
    .order("start_at")
    .limit(5);
  for (const e of futureSchedule.data ?? []) {
    const v = scheduleRowToView(e as never, courseMap as never);
    upcomingDeadlines.push({
      id: v.id,
      title: v.title,
      courseName: v.courseName,
      dueAt: v.startAt,
      kind: "event",
    });
  }
  upcomingDeadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const topDeadlines = upcomingDeadlines.slice(0, 5);

  // Focus today
  const todayFocusRows = (focusRes.data ?? []).filter((r: { started_at: string }) => {
    const d = new Date(r.started_at).toISOString().slice(0, 10);
    return d === new Date().toISOString().slice(0, 10);
  });
  const focusMinutes = todayFocusRows.reduce((sum: number, r: { duration_minutes: number }) => sum + (r.duration_minutes ?? 0), 0);
  const focusSessions = todayFocusRows.length;
  const focusStreak = computeStreak((focusRes.data ?? []).map((r: { started_at: string }) => r.started_at));

  // Study activity
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const { count: studySessionsCount } = await supabase
    .from("schedule_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "study_session");
  const studySessions = studySessionsCount ?? 0;
  const notesCreated = (notesRes.data ?? []).length;

  // Smart recommendation: top of priorityTasks
  let recommendation: DashboardRecommendation = { task: null, reason: "No tasks yet — create one to get a recommendation.", estimateLabel: null };
  if (priorityTasks.length > 0) {
    const top = priorityTasks[0];
    const reason = schedule.find((s) => s.taskId === top.id)?.reason ?? "Highest priority";
    recommendation = {
      task: top,
      reason,
      estimateLabel: top.estimateMinutes ? `~${top.estimateMinutes} minutes` : null,
    };
  } else if (unfinished.length > 0) {
    const top = unfinished[0];
    recommendation = { task: top, reason: "Next up", estimateLabel: top.estimateMinutes ? `~${top.estimateMinutes} minutes` : null };
  }

  // Announcements (preserve)
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));
  const announcements = (announcementsRes.data ?? []).map((a) => ({
    id: a.id,
    text: a.text,
    courseName: courseNameById.get(a.course_id) ?? "Unknown course",
    creatorName: a.creator_name,
    publishTime: a.publish_time,
  }));

  const googleLinked = !!(googleAccountRes.data && !(googleAccountRes.data as { needs_reconnect: boolean }).needs_reconnect);
  const lastSyncedAt = (googleAccountRes.data as { last_synced_at: string | null } | null)?.last_synced_at ?? null;
  const stale = Boolean(googleLinked && lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() > 12 * 60 * 60 * 1000);

  return {
    todaySchedule,
    priorityTasks,
    upcomingDeadlines: topDeadlines,
    focus: { minutes: focusMinutes, sessions: focusSessions, streak: focusStreak },
    activity: { completedTasks, studySessions, notesCreated },
    recommendation,
    announcements,
    courses,
    coursesCount: courses.length,
    tasksCount: tasks.length,
    googleLinked,
    stale,
    lastSyncedAt,
  };
}
