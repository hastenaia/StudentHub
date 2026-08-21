import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type {
  CalendarEvent,
  DashboardAnnouncement,
  DashboardAssignment,
  DashboardCourse,
  DashboardData,
  GoogleAccountView,
} from "@/types/academics";

/**
 * Server-side view assembly for the Academic Dashboard. Reads the Supabase
 * cache (never Google) and runs the pure GPA math. Cheap, deterministic and
 * safe to call from a Server Component on every page load.
 */

/** After this long without a sync, we nudge the user to refresh. */
const STALENESS_MS = 12 * 60 * 60 * 1000;

export async function getGoogleAccountView(userId: string): Promise<GoogleAccountView> {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("google_accounts")
    .select("email, last_synced_at, needs_reconnect")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) return { linked: false, email: null, lastSyncedAt: null, needsReconnect: false };
  return {
    linked: true,
    email: account.email,
    lastSyncedAt: account.last_synced_at,
    needsReconnect: account.needs_reconnect,
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const [accountView, courses, assignments, announcements, events] = await Promise.all([
    getGoogleAccountView(userId),
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("assignments")
      .select("*")
      .eq("user_id", userId)
      .order("due_at", { ascending: true }),
    supabase
      .from("announcements")
      .select("*")
      .eq("user_id", userId)
      .order("publish_time", { ascending: false })
      .limit(6),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(12),
  ]);

  const courseRows = courses.data ?? [];
  const assignmentRows = assignments.data ?? [];
  const announcementRows = announcements.data ?? [];
  const eventRows = events.data ?? [];

  const now = Date.now();
  const dashboardCourses: DashboardCourse[] = courseRows.map((course) => {
    const upcoming = assignmentRows
      .filter(
        (a) => a.course_id === course.id && a.due_at && new Date(a.due_at).getTime() >= now
      )
      .slice(0, 3)
      .map((a) => toDashboardAssignment(a, course.name));

    return {
      id: course.id,
      name: course.name,
      section: course.section,
      room: course.room,
      teacherName: course.teacher_name,
      color: course.color,
      source: course.source,
      creditHours: Number(course.credit_hours ?? 0),
      upcomingAssignments: upcoming,
    };
  });

  const courseNameById = new Map(courseRows.map((c) => [c.id, c.name]));
  const dashboardAnnouncements: DashboardAnnouncement[] = announcementRows.map((a) => ({
    id: a.id,
    text: a.text,
    courseName: courseNameById.get(a.course_id) ?? "Unknown course",
    creatorName: a.creator_name,
    publishTime: a.publish_time,
  }));

  // Global "due soon" list — takes the per-course top pick, then the top 6
  // by due date across everything. Keeps the overview row tight.
  const upcomingGlobal = assignmentRows
    .filter((a) => a.due_at && new Date(a.due_at).getTime() >= now)
    .map((a) => toDashboardAssignment(a, courseNameById.get(a.course_id) ?? "Unknown course"))
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 6);

  const calendarEvents: CalendarEvent[] = eventRows.map((e) => ({
    id: e.id,
    summary: e.summary,
    location: e.location,
    startAt: e.start_at,
    endAt: e.end_at,
    allDay: e.all_day,
  }));

  const lastSyncedAt = accountView.lastSyncedAt;
  const stale = Boolean(
    accountView.linked &&
      lastSyncedAt &&
      Date.now() - new Date(lastSyncedAt).getTime() > STALENESS_MS
  );

  return {
    googleLinked: accountView.linked && !accountView.needsReconnect,
    googleEmail: accountView.email,
    lastSyncedAt,
    stale,
    courses: dashboardCourses,
    upcoming: upcomingGlobal,
    announcements: dashboardAnnouncements,
    calendarEvents,
  };
}

function toDashboardAssignment(
  a: Database["public"]["Tables"]["assignments"]["Row"],
  courseName: string
): DashboardAssignment {
  return {
    id: a.id,
    title: a.title,
    courseName,
    courseId: a.course_id,
    dueAt: a.due_at,
    description: a.description,
    submitted: a.submitted,
  };
}