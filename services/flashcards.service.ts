import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Flashcard } from "@/types/study";
import { withActiveCourses } from "@/lib/supabase/queries";
import { flashcardRowToView } from "@/lib/flashcardView";

export async function getFlashcardsData(userId: string): Promise<{ flashcards: Flashcard[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const { rows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("flashcards").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  );
  const flashcards: Flashcard[] = rows.map((row) => flashcardRowToView(row, courseMap));
  return { flashcards, courses };
}
