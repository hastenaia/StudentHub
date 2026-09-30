import { describe, expect, it } from "vitest";
import { aiResultText, buildAIRequest, toFlashcardPairs, toQuizQuestions, type AIFormInputs } from "./aiRequests";

const empty: AIFormInputs = { text: "", noteId: "", courseId: "", count: "" };

describe("buildAIRequest", () => {
  it("validates required input per action", () => {
    expect(buildAIRequest("explain", { ...empty, text: "  " })).toEqual({ error: "Please enter a concept to explain." });
    expect(buildAIRequest("plan", empty)).toEqual({ error: "Enter a topic for the study plan." });
    for (const action of ["summarize", "flashcards", "quiz"] as const) {
      expect("error" in buildAIRequest(action, empty)).toBe(true);
    }
  });

  it("sends the selected note instead of pasted text", () => {
    const req = buildAIRequest("flashcards", { text: "pasted", noteId: "n1", courseId: "c1", count: "7" });
    expect(req).toEqual({ endpoint: "/api/ai/generate-flashcards", body: { noteId: "n1", content: undefined, count: 7, courseId: "c1" } });
  });

  it("sends pasted text and defaults counts", () => {
    expect(buildAIRequest("quiz", { ...empty, text: "pasted", count: "x" })).toEqual({
      endpoint: "/api/ai/generate-quiz",
      body: { noteId: undefined, content: "pasted", count: 5, courseId: undefined, title: "Practice Quiz" },
    });
    expect(buildAIRequest("plan", { ...empty, text: "Exams" })).toEqual({
      endpoint: "/api/ai/study-plan",
      body: { topic: "Exams", courseId: undefined, durationDays: 7 },
    });
  });
});

describe("aiResultText", () => {
  it("prefers prose fields and falls back to JSON", () => {
    expect(aiResultText({ summary: "S", title: "T" })).toBe("S");
    expect(aiResultText({ explanation: "E" })).toBe("E");
    expect(aiResultText({ flashcards: [] })).toBe(JSON.stringify({ flashcards: [] }, null, 2));
  });
});

describe("toFlashcardPairs", () => {
  it("reads {flashcards} or a bare array and drops incomplete cards", () => {
    const cards = [{ front: " Q ", back: " A " }, { front: "Q2", back: "  " }, { back: "A3" }];
    expect(toFlashcardPairs({ flashcards: cards })).toEqual([{ front: "Q", back: "A" }]);
    expect(toFlashcardPairs(cards)).toEqual([{ front: "Q", back: "A" }]);
    expect(toFlashcardPairs(null)).toEqual([]);
    expect(toFlashcardPairs({ flashcards: "nope" })).toEqual([]);
  });
});

describe("toQuizQuestions", () => {
  it("normalizes questions and drops incomplete ones", () => {
    const questions = toQuizQuestions({
      questions: [
        { question_text: " What? ", question_type: "multiple_choice", options: ["a", "b"], correct_answer: " a ", explanation: "e" },
        { question_text: "Odd type", question_type: "essay", correct_answer: "x" },
        { question_text: "No answer" },
      ],
    });
    expect(questions).toEqual([
      { questionText: "What?", questionType: "multiple_choice", options: ["a", "b"], correctAnswer: "a", explanation: "e" },
      { questionText: "Odd type", questionType: "short_answer", options: [], correctAnswer: "x", explanation: null },
    ]);
    expect(toQuizQuestions({})).toEqual([]);
  });
});
