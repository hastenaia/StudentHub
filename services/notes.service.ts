import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Note } from "@/types/study";

export async function getNotesData(userId: string): Promise<{ notes: Note[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const [notesRes, coursesRes] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false).order("name"),
  ]);
  const courses: CourseOption[] = (coursesRes.data ?? []).map((c: { id: string; name: string; course_name: string | null; color: string | null }) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const notes: Note[] = (notesRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    favorite: row.favorite ?? false,
    tags: row.tags ?? [],
    courseId: row.course_id,
    courseName: row.course_id ? courseMap.get(row.course_id)?.name ?? null : null,
    courseColor: row.course_id ? courseMap.get(row.course_id)?.color ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return { notes, courses };
}
