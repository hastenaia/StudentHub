import { createClient } from "@/lib/supabase/server";
import { computeStudyStats, isoDaysAgo, type StudyStats } from "@/lib/focus";

/**
 * Server-side reads for the Focus page. Sessions from the last 90 days are
 * enough for weekly stats plus a long streak walk-back, and stay cheap.
 */

const LOOKBACK_DAYS = 90;
const RECENT_SESSION_LIMIT = 8;

export interface FocusCourseOption {
  id: string;
  name: string;
  color: string | null;
}

export interface FocusTaskOption {
  id: string;
  title: string;
}

export interface RecentSession {
  id: string;
  courseId: string | null;
  courseName: string | null;
  startedAt: string;
  durationSeconds: number;
  kind: string;
}

export interface FocusPageData {
  stats: StudyStats;
  recentSessions: RecentSession[];
  courses: FocusCourseOption[];
  openTasks: FocusTaskOption[];
}

export async function getFocusPageData(userId: string): Promise<FocusPageData> {
  const supabase = await createClient();
  const since = isoDaysAgo(new Date(), LOOKBACK_DAYS);

  const [sessions, courses, tasks] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, course_id, started_at, duration_seconds, kind")
      .eq("user_id", userId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1000),
    supabase
      .from("courses")
      .select("id, name, color")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", userId)
      .in("status", ["todo", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50),
  ]);

  const sessionRows = sessions.data ?? [];
  const courseNameById = new Map((courses.data ?? []).map((c) => [c.id, c.name]));

  const stats = computeStudyStats(
    sessionRows.map((s) => ({
      startedAt: s.started_at,
      durationSeconds: s.duration_seconds,
      kind: s.kind,
      courseId: s.course_id,
    })),
    new Date()
  );

  const recentSessions: RecentSession[] = sessionRows
    .slice(0, RECENT_SESSION_LIMIT)
    .map((s) => ({
      id: s.id,
      courseId: s.course_id,
      courseName: s.course_id ? (courseNameById.get(s.course_id) ?? null) : null,
      startedAt: s.started_at,
      durationSeconds: s.duration_seconds,
      kind: s.kind,
    }));

  return {
    stats,
    recentSessions,
    courses: (courses.data ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color })),
    openTasks: (tasks.data ?? []).map((t) => ({ id: t.id, title: t.title })),
  };
}
