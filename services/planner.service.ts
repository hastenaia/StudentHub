import { createClient } from "@/lib/supabase/server";
import {
  buildDeadlineRadar,
  DEFAULT_HORIZON_DAYS,
  type DeadlineRadar,
} from "@/lib/deadlineRadar";
import {
  buildDailyPlan,
  PLAN_ASSIGNMENT_HORIZON_DAYS,
  type DailyPlan,
} from "@/lib/dailyPlan";
import type { TaskPriority } from "@/types/tasks";

/**
 * Server-side reads for the planning features (Deadline Radar + Smart Daily
 * Plan). Reads only the Supabase cache — never Google directly.
 */

function startOfLocalDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Radar over the rolling horizon: unsubmitted work, course names joined. */
export async function getDeadlineRadarData(userId: string): Promise<DeadlineRadar> {
  const supabase = await createClient();
  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + DEFAULT_HORIZON_DAYS);

  const [assignments, courses] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, course_id, due_at, submitted")
      .eq("user_id", userId)
      .eq("submitted", false)
      .lt("due_at", horizonEnd.toISOString())
      .order("due_at", { ascending: true }),
    supabase.from("courses").select("id, name").eq("user_id", userId),
  ]);

  const courseNameById = new Map((courses.data ?? []).map((c) => [c.id, c.name]));

  return buildDeadlineRadar(
    (assignments.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      courseId: a.course_id,
      courseName: courseNameById.get(a.course_id) ?? "Unknown course",
      dueAt: a.due_at,
      submitted: a.submitted,
    })),
    now
  );
}

/** Today's prioritized plan: open tasks + near-deadline work + free windows. */
export async function getDailyPlan(userId: string): Promise<DailyPlan> {
  const supabase = await createClient();
  const now = new Date();
  const dayStart = startOfLocalDay(now);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + PLAN_ASSIGNMENT_HORIZON_DAYS);

  const [tasks, assignments, events, courses] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, due_at, estimate_minutes, status")
      .eq("user_id", userId)
      .in("status", ["todo", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("assignments")
      .select("id, title, course_id, due_at")
      .eq("user_id", userId)
      .eq("submitted", false)
      .lt("due_at", horizonEnd.toISOString())
      .order("due_at", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("summary, start_at, end_at, all_day")
      .eq("user_id", userId)
      .gte("start_at", dayStart.toISOString())
      .lt("start_at", dayEnd.toISOString())
      .order("start_at", { ascending: true }),
    supabase.from("courses").select("id, name").eq("user_id", userId),
  ]);

  const courseNameById = new Map((courses.data ?? []).map((c) => [c.id, c.name]));

  return buildDailyPlan(
    (tasks.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as TaskPriority,
      dueAt: t.due_at,
      estimateMinutes: t.estimate_minutes,
      status: t.status,
    })),
    (assignments.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      courseId: a.course_id,
      courseName: courseNameById.get(a.course_id) ?? "Unknown course",
      dueAt: a.due_at as string,
    })),
    (events.data ?? []).map((e) => ({
      summary: e.summary,
      startAt: e.start_at,
      endAt: e.end_at,
      allDay: e.all_day,
    })),
    now
  );
}
