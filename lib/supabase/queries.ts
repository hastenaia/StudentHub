import type { createClient } from "@/lib/supabase/server";
import { toCourseOptions } from "@/lib/courseView";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** The user's non-archived courses in the shape `toCourseOptions` (lib/courseView) expects, by name. */
export function activeCoursesQuery(supabase: ServerClient, userId: string) {
  return supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false).order("name");
}

/**
 * Runs a page's main query alongside the active-courses query (one round trip) and returns its rows
 * plus the course options and an id → option map for enriching rows with course name/color.
 */
export async function withActiveCourses<Row>(
  supabase: ServerClient,
  userId: string,
  query: PromiseLike<{ data: Row[] | null }>
) {
  const [res, coursesRes] = await Promise.all([query, activeCoursesQuery(supabase, userId)]);
  const courses = toCourseOptions(coursesRes.data);
  return { rows: res.data ?? [], courses, courseMap: new Map(courses.map((c) => [c.id, c])) };
}
