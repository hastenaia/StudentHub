import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizPlayer } from "./QuizPlayer";
import { QuizReview } from "./QuizReview";
import { QuizDialog } from "./QuizDialog";
import { QuizCard } from "./QuizzesTab";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { gradeQuiz } from "@/lib/quizView";
import type { Quiz, QuizQuestion } from "@/types/study";

const toast = vi.fn();
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ toast, notify: vi.fn() }) }));
vi.mock("@/services/quizzesClient.service", () => ({ quizzesClientService: { createQuiz: vi.fn() } }));

const q = (id: string, questionType: QuizQuestion["questionType"], over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  questionText: `Question ${id}`,
  questionType,
  options: null,
  correctAnswer: "A",
  explanation: null,
  position: 0,
  ...over,
});
const quiz: Quiz = {
  id: "z1",
  courseId: null,
  courseName: null,
  title: "Cells",
  description: "Basics",
  questions: [q("mc", "multiple_choice", { options: ["A", "B"] }), q("tf", "true_false", { correctAnswer: "True" }), q("sa", "short_answer")],
  createdAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("QuizPlayer", () => {
  it("renders an input per question type and reports answers", () => {
    const onAnswer = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<QuizPlayer quiz={quiz} answers={{ mc: "B" }} onAnswer={onAnswer} onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByText("Basics")).toBeTruthy();
    expect((screen.getByLabelText("B") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText("A"));
    fireEvent.click(screen.getByLabelText("True"));
    fireEvent.change(screen.getByLabelText("Question sa"), { target: { value: "x" } });
    expect(onAnswer.mock.calls).toEqual([["mc", "A"], ["tf", "True"], ["sa", "x"]]);
    fireEvent.click(screen.getByRole("button", { name: "Submit Quiz" }));
    fireEvent.click(screen.getByRole("button", { name: /Close/ }));
    expect(onSubmit).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("handles a multiple choice question without options and no description", () => {
    render(<QuizPlayer quiz={{ ...quiz, description: null, questions: [q("mc", "multiple_choice")] }} answers={{}} onAnswer={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

describe("QuizReview", () => {
  it("summarizes mistakes with corrections and explanations", () => {
    const questions = [q("a", "short_answer", { explanation: "Because" }), q("b", "multiple_choice", { options: ["A", "B"] })];
    const onBack = vi.fn();
    const onRetry = vi.fn();
    render(<QuizReview title="Cells" result={gradeQuiz(questions, { b: "A" })} onBack={onBack} onRetry={onRetry} />);
    expect(screen.getByText("Score: 1 / 2")).toBeTruthy();
    expect(screen.getByText("1 incorrect — review below.")).toBeTruthy();
    expect(screen.getByText("Your answer: (empty)")).toBeTruthy();
    expect(screen.getByText("Explanation: Because")).toBeTruthy();
    expect(screen.getByText(/Options: A, B/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Retry Quiz" }));
    expect(onBack).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
  });

  it("celebrates a perfect score", () => {
    render(<QuizReview title="Cells" result={gradeQuiz([q("a", "short_answer")], { a: "a" })} onBack={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText("Perfect! You got all correct.")).toBeTruthy();
    expect(screen.queryByText(/Correct:/)).toBeNull();
  });
});

describe("QuizCard", () => {
  it("shows details and wires the actions", () => {
    const onStart = vi.fn();
    const onDelete = vi.fn();
    const { rerender } = render(<QuizCard quiz={{ ...quiz, courseName: "Biology" }} onStart={onStart} onDelete={onDelete} />);
    expect(screen.getByText("3 questions")).toBeTruthy();
    expect(screen.getByText("Biology")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    fireEvent.click(screen.getByLabelText("Delete Cells"));
    expect(onStart).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    rerender(<QuizCard quiz={{ ...quiz, description: null }} onStart={onStart} onDelete={onDelete} />);
    expect(screen.queryByText("Basics")).toBeNull();
  });
});

describe("QuizDialog", () => {
  const courses = [{ id: "c1", name: "Biology", color: null }];
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it("creates a quiz and fills in its course name", async () => {
    vi.mocked(quizzesClientService.createQuiz).mockResolvedValue({ success: true, data: { ...quiz, courseId: "c1" } });
    const onCreated = vi.fn();
    render(<QuizDialog courses={courses} onClose={vi.fn()} onCreated={onCreated} />);
    fill("Title *", "Cells");
    fill("Question *", "Powerhouse?");
    fill("Option 1", "Mitochondria");
    fill("Correct answer *", "Mitochondria");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create Quiz" })));
    expect(quizzesClientService.createQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cells", questions: [expect.objectContaining({ options: ["Mitochondria"], correctAnswer: "Mitochondria" })] })
    );
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ courseName: "Biology" }));
  });

  it("adds and removes questions, hiding options for other types", () => {
    render(<QuizDialog courses={courses} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect((screen.getByLabelText("Remove question 1") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Add Question/ }));
    expect(screen.getAllByLabelText("Question *")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Remove question 2"));
    expect(screen.getAllByLabelText("Question *")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "short_answer" } });
    expect(screen.queryByLabelText("Option 1")).toBeNull();
    expect(screen.getByPlaceholderText("Answer")).toBeTruthy();
  });

  it("reports a failed create", async () => {
    vi.mocked(quizzesClientService.createQuiz).mockResolvedValue({ success: false, message: "denied" });
    const onCreated = vi.fn();
    render(<QuizDialog courses={courses} onClose={vi.fn()} onCreated={onCreated} />);
    fill("Title *", "Cells");
    fill("Question *", "Q");
    fill("Correct answer *", "A");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create Quiz" })));
    expect(onCreated).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Failed", description: "denied" }));
  });
});
