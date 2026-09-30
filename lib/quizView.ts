import type { Database } from "@/types/database.types";
import type { CourseOption, QuestionType, Quiz, QuizDraft, QuizQuestion } from "@/types/study";
import type { QuizFormValues } from "@/lib/validations/study";
import { matchesCourseFilter } from "@/lib/courseView";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];
type QuestionInsert = Database["public"]["Tables"]["quiz_questions"]["Insert"];

function questionRowToView(row: QuestionRow): QuizQuestion {
  return {
    id: row.id,
    questionText: row.question_text,
    questionType: row.question_type as QuestionType,
    options: Array.isArray(row.options) ? (row.options as string[]) : null,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    position: row.position,
  };
}

/** Map a quizzes row plus its question rows; course names resolve only with a `courseMap`. */
export function quizRowToView(row: QuizRow, questions: QuestionRow[], courseMap: Map<string, Pick<CourseOption, "name">> = new Map()): Quiz {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: courseMap.get(row.course_id ?? "")?.name ?? null,
    title: row.title,
    description: row.description,
    questions: [...questions].sort((a, b) => a.position - b.position).map(questionRowToView),
    createdAt: row.created_at,
  };
}

/** Question rows bucketed by quiz id, for one batched fetch instead of N+1. */
export function groupQuestionsByQuiz(rows: QuestionRow[]): Map<string, QuestionRow[]> {
  const byQuiz = new Map<string, QuestionRow[]>();
  for (const row of rows) byQuiz.set(row.quiz_id, [...(byQuiz.get(row.quiz_id) ?? []), row]);
  return byQuiz;
}

/** Insert payload for a new quiz's questions; only multiple choice keeps options. */
export function quizDraftToQuestionRows(quizId: string, draft: QuizDraft): QuestionInsert[] {
  return draft.questions.map((q, position) => ({
    quiz_id: quizId,
    question_text: q.questionText.trim(),
    question_type: q.questionType,
    options: q.questionType === "multiple_choice" ? q.options : null,
    correct_answer: q.correctAnswer.trim(),
    explanation: q.explanation?.trim() || null,
    position,
  }));
}

export const EMPTY_QUIZ_QUESTION: QuizFormValues["questions"][number] = {
  questionText: "",
  questionType: "multiple_choice",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
};

export const EMPTY_QUIZ_FORM: QuizFormValues = { title: "", description: "", courseId: "", questions: [EMPTY_QUIZ_QUESTION] };

export function quizFormToDraft(values: QuizFormValues): QuizDraft {
  return {
    title: values.title,
    description: values.description || null,
    courseId: values.courseId || null,
    questions: values.questions.map((q) => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.questionType === "multiple_choice" ? q.options.filter(Boolean) : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || null,
    })),
  };
}

export interface QuizReviewItem {
  question: QuizQuestion;
  userAnswer: string;
  correct: boolean;
}

export interface QuizResult {
  score: number;
  total: number;
  review: QuizReviewItem[];
}

/** Answers match case-insensitively, ignoring surrounding whitespace. */
export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, string>): QuizResult {
  const review = questions.map((question) => {
    const userAnswer = (answers[question.id] ?? "").trim();
    return { question, userAnswer, correct: userAnswer.toLowerCase() === question.correctAnswer.trim().toLowerCase() };
  });
  return { score: review.filter((r) => r.correct).length, total: questions.length, review };
}

export function filterQuizzes(quizzes: Quiz[], query: string, course: string): Quiz[] {
  const q = query.trim().toLowerCase();
  return quizzes.filter(
    (quiz) => (!q || `${quiz.title} ${quiz.description ?? ""}`.toLowerCase().includes(q)) && matchesCourseFilter(quiz.courseId, course)
  );
}

export function questionTypeLabel(type: QuestionType): string {
  return type.replace("_", " ");
}
