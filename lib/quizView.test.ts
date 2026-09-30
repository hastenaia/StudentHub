import { describe, expect, it } from "vitest";
import {
  EMPTY_QUIZ_FORM,
  filterQuizzes,
  gradeQuiz,
  groupQuestionsByQuiz,
  questionTypeLabel,
  quizDraftToQuestionRows,
  quizFormToDraft,
  quizRowToView,
} from "./quizView";
import type { Database } from "@/types/database.types";
import type { Quiz, QuizQuestion } from "@/types/study";

type QuestionRow = Database["public"]["Tables"]["quiz_questions"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

const qRow = (id: string, quizId: string, position: number, over: Partial<QuestionRow> = {}): QuestionRow => ({
  id,
  quiz_id: quizId,
  position,
  question_text: `Q${id}`,
  question_type: "short_answer",
  options: null,
  correct_answer: "A",
  explanation: null,
  ...over,
});
const quizRow: QuizRow = {
  id: "z1",
  user_id: "u1",
  course_id: "c1",
  title: "Cells",
  description: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};
const question = (id: string, correctAnswer: string): QuizQuestion => ({
  id,
  questionText: id,
  questionType: "short_answer",
  options: null,
  correctAnswer,
  explanation: null,
  position: 0,
});

describe("quiz row mapping", () => {
  it("maps a quiz with its questions in position order", () => {
    const rows = [qRow("b", "z1", 1, { question_type: "multiple_choice", options: ["x", "y"] }), qRow("a", "z1", 0)];
    const quiz = quizRowToView(quizRow, rows, new Map([["c1", { name: "Biology" }]]));
    expect(quiz).toMatchObject({ id: "z1", courseId: "c1", courseName: "Biology", title: "Cells", description: null });
    expect(quiz.questions.map((q) => [q.id, q.questionType, q.options])).toEqual([
      ["a", "short_answer", null],
      ["b", "multiple_choice", ["x", "y"]],
    ]);
  });

  it("leaves the course unnamed without a map", () => {
    expect(quizRowToView(quizRow, []).courseName).toBeNull();
  });

  it("groups question rows by quiz", () => {
    const grouped = groupQuestionsByQuiz([qRow("a", "z1", 0), qRow("b", "z2", 0), qRow("c", "z1", 1)]);
    expect(grouped.get("z1")?.map((r) => r.id)).toEqual(["a", "c"]);
    expect(grouped.get("z2")?.map((r) => r.id)).toEqual(["b"]);
  });
});

describe("quiz drafts", () => {
  const values = {
    title: "T",
    description: "",
    courseId: "",
    questions: [
      { questionText: " What? ", questionType: "multiple_choice" as const, options: ["a", "", "b", ""], correctAnswer: " a ", explanation: "" },
      { questionText: "True?", questionType: "true_false" as const, options: ["x"], correctAnswer: "True", explanation: " because " },
    ],
  };

  it("normalizes form values into a draft", () => {
    expect(quizFormToDraft(values)).toEqual({
      title: "T",
      description: null,
      courseId: null,
      questions: [
        { questionText: " What? ", questionType: "multiple_choice", options: ["a", "b"], correctAnswer: " a ", explanation: null },
        { questionText: "True?", questionType: "true_false", options: [], correctAnswer: "True", explanation: " because " },
      ],
    });
    expect(quizFormToDraft(EMPTY_QUIZ_FORM).questions).toHaveLength(1);
  });

  it("builds trimmed question rows; only multiple choice keeps options", () => {
    expect(quizDraftToQuestionRows("z1", quizFormToDraft(values))).toEqual([
      { quiz_id: "z1", question_text: "What?", question_type: "multiple_choice", options: ["a", "b"], correct_answer: "a", explanation: null, position: 0 },
      { quiz_id: "z1", question_text: "True?", question_type: "true_false", options: null, correct_answer: "True", explanation: "because", position: 1 },
    ]);
  });
});

describe("gradeQuiz", () => {
  it("scores case- and whitespace-insensitive answers and reviews every question", () => {
    const result = gradeQuiz([question("q1", "Mitosis "), question("q2", "ATP"), question("q3", "x")], { q1: " mitosis", q2: "adp" });
    expect(result.score).toBe(1);
    expect(result.total).toBe(3);
    expect(result.review.map((r) => [r.question.id, r.userAnswer, r.correct])).toEqual([
      ["q1", "mitosis", true],
      ["q2", "adp", false],
      ["q3", "", false],
    ]);
  });
});

describe("filterQuizzes", () => {
  const quiz = (id: string, over: Partial<Quiz>): Quiz => ({ id, courseId: null, courseName: null, title: id, description: null, questions: [], createdAt: "", ...over });
  const quizzes = [quiz("Cells", { courseId: "c1", description: "Mitosis basics" }), quiz("Loops", {})];

  it("matches title or description and the course filter", () => {
    expect(filterQuizzes(quizzes, " MITOSIS", "all").map((q) => q.id)).toEqual(["Cells"]);
    expect(filterQuizzes(quizzes, "", "none").map((q) => q.id)).toEqual(["Loops"]);
    expect(filterQuizzes(quizzes, "", "c1").map((q) => q.id)).toEqual(["Cells"]);
  });
});

it("questionTypeLabel humanizes the type", () => {
  expect(questionTypeLabel("multiple_choice")).toBe("multiple choice");
});
