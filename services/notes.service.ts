import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Note } from "@/types/study";
import { withActiveCourses } from "@/lib/supabase/queries";
import { noteRowToView } from "@/lib/noteView";

export async function getNotesData(userId: string): Promise<{ notes: Note[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const { rows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false })
  );
  const notes: Note[] = rows.map((row) => noteRowToView(row, courseMap));
  return { notes, courses };
}
