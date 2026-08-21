import { createClient } from "@/lib/supabase/server";
import type { CourseOption, Quiz } from "@/types/study";

export async function getQuizzesData(userId: string): Promise<{ quizzes: Quiz[]; courses: CourseOption[] }> {
  const supabase = await createClient();
  const [quizzesRes, coursesRes] = await Promise.all([
    supabase.from("quizzes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("courses").select("id, name, course_name, color").eq("user_id", userId).eq("archived", false).order("name"),
  ]);
  const courses: CourseOption[] = (coursesRes.data ?? []).map((c: { id: string; name: string; course_name: string | null; color: string | null }) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const quizzes: Quiz[] = [];
  for (const q of quizzesRes.data ?? []) {
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", q.id)
      .order("position");
    quizzes.push({
      id: q.id,
      courseId: q.course_id,
      courseName: q.course_id ? courseMap.get(q.course_id)?.name ?? null : null,
      title: q.title,
      description: q.description,
      questions: (questions ?? []).map((qq) => ({
        id: qq.id,
        questionText: qq.question_text,
        questionType: qq.question_type as Quiz["questions"][number]["questionType"],
        options: qq.options as string[] | null,
        correctAnswer: qq.correct_answer,
        explanation: qq.explanation,
        position: qq.position,
      })),
      createdAt: q.created_at,
    });
  }
  return { quizzes, courses };
}
