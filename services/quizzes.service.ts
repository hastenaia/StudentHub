import { createClient } from "@/lib/supabase/server";
import { toCourseOptions } from "@/lib/courseView";
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

  const quizRows = quizzesRes.data ?? [];
  // Single batched fetch O(2) roundtrips instead of N+1.
  const quizIds = quizRows.map((q) => q.id);
  type QuestionRow = {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string | null;
    position: number;
  };
  let allQuestions: QuestionRow[] = [];
  if (quizIds.length) {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .in("quiz_id", quizIds)
      .order("position");
    allQuestions = (data ?? []) as unknown as QuestionRow[];
  }
  const questionsByQuiz = new Map<string, QuestionRow[]>();
  for (const qq of allQuestions) {
    const bucket = questionsByQuiz.get(qq.quiz_id);
    if (bucket) bucket.push(qq);
    else questionsByQuiz.set(qq.quiz_id, [qq]);
  }

  const quizzes: Quiz[] = quizRows.map((q) => {
    const questions = questionsByQuiz.get(q.id) ?? [];
    return {
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
    };
  });
  return { quizzes, courses };
}
