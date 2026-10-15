import { createClient } from "@/lib/supabase/server";
import { courseRowToView } from "@/lib/courseView";
import type { Course } from "@/types/courses";

export async function getCoursesData(userId: string): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(courseRowToView);
}
