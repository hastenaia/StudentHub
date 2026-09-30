import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Flashcard } from "@/types/study";
import { withActiveCourses } from "@/lib/supabase/queries";

export async function getFlashcardsData(userId: string): Promise<{ flashcards: Flashcard[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const { rows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("flashcards").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  );
  const flashcards: Flashcard[] = rows.map((row) => ({
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
