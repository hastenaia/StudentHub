import { createClient } from "@/lib/supabase/server";
import { buildTopSchedule } from "@/lib/scheduling";
import { taskRowToView } from "@/lib/taskView";
import { scheduleRowToView, calendarRowToView } from "@/lib/scheduleView";
import type { Task } from "@/types/tasks";
import { computeStreak, endOfDay, startOfDay } from "@/lib/dates";
import { courseRowToView, toCourseOptions } from "@/lib/courseView";
import { progressByCourse } from "@/lib/progress";
import type { CourseProgress } from "@/types/courses";

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

export interface CourseSnapshotItem {
  id: string;
  name: string;
  color: string | null;
  instructor: string | null;
  progress: CourseProgress | null;
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
  courseSnapshot: CourseSnapshotItem[];
  coursesCount: number;
  tasksCount: number;
  googleLinked: boolean;
  stale: boolean;
  lastSyncedAt: string | null;
}

type CourseEntry = { id: string; name: string; color: string | null };
type CourseMap = Map<string, CourseEntry>;

interface DashboardWindows {
  todayStart: string;
  todayEnd: string;
  nowIso: string;
  nowMs: number;
  todayStr: string;
  focusWindowStart: string;
  assignmentsSince: string;
}

function dashboardWindows(now: Date = new Date()): DashboardWindows {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  return {
    todayStart: startOfDay(now).toISOString(),
    todayEnd: endOfDay(now).toISOString(),
    nowIso,
    nowMs,
    todayStr: nowIso.slice(0, 10),
    focusWindowStart: new Date(nowMs - 90 * 86400000).toISOString(),
    assignmentsSince: new Date(nowMs - 86400000).toISOString(),
  };
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchDashboardRows(supabase: ServerClient, userId: string, w: DashboardWindows) {
  return Promise.all([
    supabase.from("schedule_events").select("*").eq("user_id", userId).gte("start_at", w.todayStart).lte("start_at", w.todayEnd).order("start_at"),
    supabase.from("calendar_events").select("*").eq("user_id", userId).gte("start_at", w.todayStart).lte("start_at", w.todayEnd).order("start_at"),
    supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    // Full rows (not activeCoursesQuery) so the snapshot can show the instructor.
    supabase.from("courses").select("*").eq("user_id", userId).eq("archived", false).order("name"),
    // Only upcoming (≥ now − 24h) rows are used; filter in SQL so years of past Classroom work can't fill the cap.
    supabase.from("assignments").select("*").eq("user_id", userId).gte("due_at", w.assignmentsSince).order("due_at").limit(500),
    supabase.from("announcements").select("*").eq("user_id", userId).order("publish_time", { ascending: false }).limit(6),
    supabase.from("focus_sessions").select("*").eq("user_id", userId).gte("started_at", w.focusWindowStart).order("started_at", { ascending: false }).limit(2000),
    supabase.from("notes").select("id, created_at").eq("user_id", userId),
    supabase.from("google_accounts").select("last_synced_at, needs_reconnect").eq("user_id", userId).maybeSingle(),
    supabase
      .from("schedule_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_at", w.nowIso)
      .in("event_type", ["assignment", "exam"])
      .order("start_at")
      .limit(5),
    supabase
      .from("schedule_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "study_session"),
    supabase.from("assignments").select("course_id, grade, max_points, weight").eq("user_id", userId).not("max_points", "is", null),
  ]);
}

type DashboardRows = Awaited<ReturnType<typeof fetchDashboardRows>>;

function buildTodaySchedule(scheduleRows: unknown, calendarRows: unknown, courseMap: CourseMap): TodayScheduleItem[] {
  const userToday: TodayScheduleItem[] = ((scheduleRows as never[] | null | undefined) ?? []).map((row) => {
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
  const googleToday: TodayScheduleItem[] = ((calendarRows as never[] | null | undefined) ?? []).map((row) => {
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
  return [...userToday, ...googleToday]
    .map((item) => ({ item, startMs: item.startAt ? Date.parse(item.startAt) || 0 : 0 }))
    .sort((a, b) => a.startMs - b.startMs)
    .map(({ item }) => item);
}

function toDashboardTasks(taskRows: unknown, courseMap: CourseMap): Task[] {
  return ((taskRows as never[] | null | undefined) ?? []).map((row) =>
    taskRowToView(row as never, courseMap as unknown as Map<string, { id: string; name: string; color: string | null }>)
  );
}

function partitionTasks(tasks: Task[]): { unfinished: Task[]; completedTasks: number } {
  const unfinished: Task[] = [];
  let completedTasks = 0;
  for (const t of tasks) {
    if (t.status === "done") completedTasks++;
    else unfinished.push(t);
  }
  return { unfinished, completedTasks };
}

function selectPriorityTasks(unfinished: Task[]): { priorityTasks: Task[]; reasonByTaskId: Map<string, string> } {
  // Top-K only (callers slice to 5) — O(N log K) instead of full sort.
  const schedule = buildTopSchedule(
    unfinished.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, estimateMinutes: t.estimateMinutes })),
    5
  );
  const reasonByTaskId = new Map(schedule.map((s) => [s.taskId, s.reason]));
  const priorityTaskIds = new Set(schedule.map((s) => s.taskId));
  return { priorityTasks: unfinished.filter((t) => priorityTaskIds.has(t.id)), reasonByTaskId };
}

function buildUpcomingDeadlines(
  unfinished: Task[],
  assignmentRows: unknown,
  futureEventRows: unknown,
  courseMap: CourseMap,
  nowMs: number
): UpcomingDeadline[] {
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
  for (const a of (assignmentRows as { id: string; title: string; course_id: string | null; due_at: string | null }[] | null | undefined) ?? []) {
    if (a.due_at && new Date(a.due_at).getTime() >= nowMs - 24 * 60 * 60 * 1000) {
      upcomingDeadlines.push({
        id: a.id,
        title: a.title,
        courseName: courseMap.get(a.course_id ?? "")?.name ?? "Unknown course",
        dueAt: a.due_at,
        kind: "assignment",
      });
    }
  }
  // Future schedule events that are deadline-like (already fetched in batch)
  for (const e of (futureEventRows as never[] | null | undefined) ?? []) {
    const v = scheduleRowToView(e as never, courseMap as never);
    upcomingDeadlines.push({
      id: v.id,
      title: v.title,
      courseName: v.courseName,
      dueAt: v.startAt,
      kind: "event",
    });
  }
  upcomingDeadlines.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return upcomingDeadlines.slice(0, 5);
}

function summarizeFocusToday(focusRows: unknown, todayStr: string): { minutes: number; sessions: number; dates: string[] } {
  // todayStr hoisted, no per-row toISOString()
  let minutes = 0;
  let sessions = 0;
  const dates: string[] = [];
  for (const r of (focusRows as { started_at: string; duration_minutes: number }[] | null | undefined) ?? []) {
    dates.push(r.started_at);
    if (r.started_at.slice(0, 10) === todayStr) {
      minutes += r.duration_minutes ?? 0;
      sessions++;
    }
  }
  return { minutes, sessions, dates };
}

function pickRecommendation(priorityTasks: Task[], unfinished: Task[], reasonByTaskId: Map<string, string>): DashboardRecommendation {
  if (priorityTasks.length > 0) {
    const top = priorityTasks[0];
    return {
      task: top,
      reason: reasonByTaskId.get(top.id) ?? "Highest priority",
      estimateLabel: top.estimateMinutes ? `~${top.estimateMinutes} minutes` : null,
    };
  }
  if (unfinished.length > 0) {
    const top = unfinished[0];
    return { task: top, reason: "Next up", estimateLabel: top.estimateMinutes ? `~${top.estimateMinutes} minutes` : null };
  }
  return { task: null, reason: "No tasks yet — create one to get a recommendation.", estimateLabel: null };
}

export async function getProductivityDashboardData(userId: string): Promise<ProductivityDashboardData> {
  const supabase = await createClient();
  const w = dashboardWindows();

  const [scheduleRes, calendarRes, tasksRes, coursesRes, assignmentsRes, announcementsRes, focusRes, notesRes, googleAccountRes, futureScheduleRes, studySessionsRes, scoredRes]: DashboardRows =
    await fetchDashboardRows(supabase, userId, w);

  const courses = toCourseOptions(coursesRes.data);
  const courseMap: CourseMap = new Map(courses.map((c) => [c.id, c]));
  const progress = progressByCourse(scoredRes.data ?? []);
  const courseSnapshot: CourseSnapshotItem[] = (coursesRes.data ?? []).map((row) => {
    const v = courseRowToView(row);
    return { id: v.id, name: v.course_name, color: v.color, instructor: v.instructor, progress: progress.get(v.id) ?? null };
  });

  const todaySchedule = buildTodaySchedule(scheduleRes.data, calendarRes.data, courseMap);
  const tasks = toDashboardTasks(tasksRes.data, courseMap);
  const { unfinished, completedTasks } = partitionTasks(tasks);
  const { priorityTasks, reasonByTaskId } = selectPriorityTasks(unfinished);
  const topDeadlines = buildUpcomingDeadlines(unfinished, assignmentsRes.data, futureScheduleRes.data, courseMap, w.nowMs);
  const focusToday = summarizeFocusToday(focusRes.data, w.todayStr);
  const focusStreak = computeStreak(focusToday.dates);

  const studySessions = studySessionsRes.count ?? 0;
  const notesCreated = (notesRes.data ?? []).length;

  const recommendation = pickRecommendation(priorityTasks, unfinished, reasonByTaskId);

  // Announcements (preserve) — reuse courseMap, no duplicate Map
  const announcements = (announcementsRes.data ?? []).map((a) => ({
    id: a.id,
    text: a.text,
    courseName: courseMap.get(a.course_id)?.name ?? "Unknown course",
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
    focus: { minutes: focusToday.minutes, sessions: focusToday.sessions, streak: focusStreak },
    activity: { completedTasks, studySessions, notesCreated },
    recommendation,
    announcements,
    courses,
    courseSnapshot,
    coursesCount: courses.length,
    tasksCount: tasks.length,
    googleLinked,
    stale,
    lastSyncedAt,
  };
}
