import { createClient } from "@/lib/supabase/server";
import { calendarRowToView, scheduleRowToView } from "@/lib/scheduleView";
import { tasksToScheduleEvents } from "@/lib/taskSchedule";
import { taskRowToView } from "@/lib/taskView";
import type { CalendarView, ScheduleCourseOption, ScheduleEvent } from "@/types/schedule";
import { isCalendarView } from "@/types/schedule";
import { activeCoursesQuery } from "@/lib/supabase/queries";
import { toCourseOptions } from "@/lib/courseView";

export interface ScheduleViewData {
  events: ScheduleEvent[];
  courses: ScheduleCourseOption[];
  googleEvents: ScheduleEvent[];
  userEvents: ScheduleEvent[];
  /** Read-only deadlines derived from `tasks.due_at`; see `lib/taskSchedule.ts`. */
  taskEvents: ScheduleEvent[];
  /** `profiles.default_calendar_view`, validated against the view names the UI offers. */
  defaultView: CalendarView;
}

export async function getScheduleData(userId: string): Promise<ScheduleViewData> {
  const supabase = await createClient();
  // Bounded 6-month window (past 60d + future 120d) instead of full-table scan;
  // ScheduleView filters by month/week/day client-side within this window.
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 86400000).toISOString();
  const windowEnd = new Date(now.getTime() + 120 * 86400000).toISOString();
  const [scheduleRes, calendarRes, coursesRes, profileRes, tasksRes] = await Promise.all([
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
    activeCoursesQuery(supabase, userId),
    supabase.from("profiles").select("default_calendar_view").eq("id", userId).maybeSingle(),
    // Same window as the event tables, so a task deadline never lands outside the range
    // the calendar is able to show.
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .not("due_at", "is", null)
      .gte("due_at", windowStart)
      .lte("due_at", windowEnd)
      .order("due_at", { ascending: true })
      .limit(2000),
  ]);

  const courses: ScheduleCourseOption[] = toCourseOptions(coursesRes.data);
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const userEvents = (scheduleRes.data ?? []).map((row) => scheduleRowToView(row, courseMap));
  const googleEvents = (calendarRes.data ?? []).map(calendarRowToView);
  const taskEvents = tasksToScheduleEvents(
    (tasksRes.data ?? []).map((row) => taskRowToView(row, courseMap))
  );

  // Merge and sort by start — timestamps pre-parsed once (inputs pre-ordered).
  const all = [...userEvents, ...googleEvents, ...taskEvents]
    .map((e) => ({ e, ms: Date.parse(e.startAt) || 0 }))
    .sort((a, b) => a.ms - b.ms)
    .map(({ e }) => e);

  const savedView = profileRes.data?.default_calendar_view;
  const defaultView: CalendarView = isCalendarView(savedView) ? savedView : "month";

  return { events: all, courses, googleEvents, userEvents, taskEvents, defaultView };
}

