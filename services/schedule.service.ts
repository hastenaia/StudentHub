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
  const [scheduleRes, calendarRes, coursesRes] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("user_id", userId)
      .order("start_at", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .order("start_at", { ascending: true }),
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

  // Merge and sort by start
  const all = [...userEvents, ...googleEvents].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  return { events: all, courses, googleEvents, userEvents };
}

// For dashboard consumption — lightweight upcoming events
export async function getUpcomingScheduleEvents(userId: string, limit = 12): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(limit);

  if (!data) return [];
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, course_name, color")
    .eq("user_id", userId)
    .eq("archived", false);
  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id, { name: c.course_name ?? c.name, color: c.color }])
  );
  return data.map((row) => scheduleRowToView(row, courseMap));
}
