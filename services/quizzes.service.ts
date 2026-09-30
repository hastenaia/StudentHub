import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Quiz } from "@/types/study";
import { withActiveCourses } from "@/lib/supabase/queries";
import { groupQuestionsByQuiz, quizRowToView } from "@/lib/quizView";

export async function getQuizzesData(userId: string): Promise<{ quizzes: Quiz[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const { rows: quizRows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("quizzes").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  );

  // Single batched fetch O(2) roundtrips instead of N+1.
  const quizIds = quizRows.map((q) => q.id);
  const { data: questionRows } = quizIds.length
    ? await supabase.from("quiz_questions").select("*").in("quiz_id", quizIds)
    : { data: [] };
  const questionsByQuiz = groupQuestionsByQuiz(questionRows ?? []);
  const quizzes: Quiz[] = quizRows.map((q) => quizRowToView(q, questionsByQuiz.get(q.id) ?? [], courseMap));
  return { quizzes, courses };
}
