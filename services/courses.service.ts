import { createClient } from "@/lib/supabase/server";
import { courseRowToView } from "@/lib/courseView";
import { progressByCourse } from "@/lib/progress";
import type { Course } from "@/types/courses";

export async function getCoursesData(userId: string): Promise<Course[]> {
  const supabase = await createClient();
  const [coursesRes, scoredRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    // Only point-bearing work can be scored (lib/progress).
    supabase
      .from("assignments")
      .select("course_id, grade, max_points, weight")
      .eq("user_id", userId)
      .not("max_points", "is", null),
  ]);

  if (coursesRes.error) throw coursesRes.error;
  const progress = progressByCourse(scoredRes.data ?? []);
  return (coursesRes.data ?? []).map((row) => ({ ...courseRowToView(row), progress: progress.get(row.id) ?? null }));
}
