import { createClient } from "@/lib/supabase/server";
import { calendarRowToView, scheduleRowToView } from "@/lib/scheduleView";
import type { ScheduleCourseOption, ScheduleEvent } from "@/types/schedule";

export interface ScheduleViewData {
  events: ScheduleEvent[];
  courses: ScheduleCourseOption[];
  googleEvents: ScheduleEvent[];
  userEvents: ScheduleEvent[];
}

export async function getScheduleData(userId: string): Promise<ScheduleViewData> {
  const supabase = await createClient();
  // Bounded 6-month window (past 60d + future 120d) instead of full-table scan;
  // ScheduleView filters by month/week/day client-side within this window.
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 86400000).toISOString();
  const windowEnd = new Date(now.getTime() + 120 * 86400000).toISOString();
  const [scheduleRes, calendarRes, coursesRes] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_at", windowStart)
      .lte("start_at", windowEnd)
      .order("start_at", { ascending: true })
      .limit(2000),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_at", windowStart)
      .lte("start_at", windowEnd)
      .order("start_at", { ascending: true })
      .limit(2000),
    supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false).order("name"),
  ]);

  const courses: ScheduleCourseOption[] = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const userEvents = (scheduleRes.data ?? []).map((row) => scheduleRowToView(row, courseMap));
  const googleEvents = (calendarRes.data ?? []).map(calendarRowToView);

  // Merge and sort by start — timestamps pre-parsed once (both inputs pre-ordered).
  const all = [...userEvents, ...googleEvents]
    .map((e) => ({ e, ms: Date.parse(e.startAt) || 0 }))
    .sort((a, b) => a.ms - b.ms)
    .map(({ e }) => e);

  return { events: all, courses, googleEvents, userEvents };
}

// For dashboard consumption — lightweight upcoming events
async function getUpcomingScheduleEvents(userId: string, limit = 12): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const [eventsRes, coursesRes] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(limit),
    supabase
      .from("courses")
      .select("id, name, course_name, color")
      .eq("user_id", userId)
      .eq("archived", false),
  ]);

  const data = eventsRes.data;
  if (!data) return [];
  const courses = coursesRes.data;
  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id, { name: c.course_name ?? c.name, color: c.color }])
  );
  return data.map((row) => scheduleRowToView(row, courseMap));
}
