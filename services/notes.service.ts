import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Note } from "@/types/study";
import { withActiveCourses } from "@/lib/supabase/queries";

export async function getNotesData(userId: string): Promise<{ notes: Note[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const { rows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false })
  );
  const notes: Note[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    favorite: row.favorite ?? false,
    tags: row.tags ?? [],
    category: row.category,
    courseId: row.course_id,
    courseName: row.course_id ? courseMap.get(row.course_id)?.name ?? null : null,
    courseColor: row.course_id ? courseMap.get(row.course_id)?.color ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return { notes, courses };
}
