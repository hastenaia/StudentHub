import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Flashcard } from "@/types/study";

export async function getFlashcardsData(userId: string): Promise<{ flashcards: Flashcard[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const [flashRes, coursesRes] = await Promise.all([
    supabase.from("flashcards").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false).order("name"),
  ]);
  const courses: CourseOption[] = (coursesRes.data ?? []).map((c: { id: string; name: string; course_name: string | null; color: string | null }) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const flashcards: Flashcard[] = (flashRes.data ?? []).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_id ? courseMap.get(row.course_id)?.name ?? null : null,
    noteId: row.note_id,
    front: row.front,
    back: row.back,
    tags: row.tags ?? [],
    isKnown: row.is_known ?? false,
    correctCount: row.correct_count ?? 0,
    incorrectCount: row.incorrect_count ?? 0,
    lastReviewed: row.last_reviewed,
    createdAt: row.created_at,
  }));
  return { flashcards, courses };
}
