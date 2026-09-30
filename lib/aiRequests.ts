// Pure request building for the Study Hub AI tab (components/study/AIAssistantTab.tsx).
import type { QuestionType, QuizDraft } from "@/types/study";

export type AIAction = "explain" | "summarize" | "flashcards" | "quiz" | "plan";

export interface AIFormInputs {
  /** Concept / topic / pasted content, depending on the action. */
  text: string;
  noteId: string;
  courseId: string;
  /** Count field: flashcards/quiz count, or study-plan days. */
  count: string;
}

type AIRequest = { endpoint: string; body: Record<string, unknown> } | { error: string };

type Spec = {
  endpoint: string;
  /** Which input the action requires, and the message shown when it's missing. */
  requires: "text" | "source";
  missing: string;
  body: (i: AIFormInputs, source: { noteId?: string; content?: string }, courseId: string | undefined) => Record<string, unknown>;
};

const SPECS: Record<AIAction, Spec> = {
  explain: {
    endpoint: "/api/ai/explain",
    requires: "text",
    missing: "Please enter a concept to explain.",
    body: (i, _s, courseId) => ({ concept: i.text, courseId }),
  },
  summarize: {
    endpoint: "/api/ai/summarize",
    requires: "source",
    missing: "Select a note or enter content.",
    body: (_i, source) => ({ ...source, title: "Note" }),
  },
  flashcards: {
    endpoint: "/api/ai/generate-flashcards",
    requires: "source",
    missing: "Select a note or paste content.",
    body: (i, source, courseId) => ({ ...source, count: Number(i.count) || 5, courseId }),
  },
  quiz: {
    endpoint: "/api/ai/generate-quiz",
    requires: "source",
    missing: "Select a note or paste content.",
    body: (i, source, courseId) => ({ ...source, count: Number(i.count) || 5, courseId, title: "Practice Quiz" }),
  },
  plan: {
    endpoint: "/api/ai/study-plan",
    requires: "text",
    missing: "Enter a topic for the study plan.",
    body: (i, _s, courseId) => ({ topic: i.text, courseId, durationDays: Number(i.count) || 7 }),
  },
};

/** Endpoint + JSON body for an action, or the validation message to show instead. */
export function buildAIRequest(action: AIAction, inputs: AIFormInputs): AIRequest {
  const spec = SPECS[action];
  // Text actions need non-blank text; note-based actions need a selected note or any pasted text.
  const ok = spec.requires === "text" ? Boolean(inputs.text.trim()) : Boolean(inputs.noteId || inputs.text);
  if (!ok) return { error: spec.missing };
  // Note-based actions send the selected note, or the pasted text when no note is picked.
  const source = { noteId: inputs.noteId || undefined, content: inputs.noteId ? undefined : inputs.text };
  return { endpoint: spec.endpoint, body: spec.body(inputs, source, inputs.courseId || undefined) };
}

/** Text to display for an AI route's `data`: its prose field, else pretty JSON (flashcards/quiz). */
export function aiResultText(data: unknown): string {
  const d = data as { explanation?: unknown; summary?: unknown; plan?: unknown } | null;
  const text = d?.explanation ?? d?.summary ?? d?.plan;
  return typeof text === "string" ? text : JSON.stringify(data, null, 2);
}

/** Label for the tab's submit button per action. */
export const AI_SUBMIT_LABEL: Record<AIAction, string> = {
  explain: "Explain",
  summarize: "Summarize",
  flashcards: "Generate flashcards",
  quiz: "Generate quiz",
  plan: "Create plan",
};

type RawCard = { front?: string; back?: string };

/** Valid `{front, back}` pairs from a flashcards response (`{flashcards: [...]}` or a bare array), trimmed. */
export function toFlashcardPairs(generated: unknown): { front: string; back: string }[] {
  const list = (generated as { flashcards?: unknown } | null)?.flashcards ?? generated;
  if (!Array.isArray(list)) return [];
  return (list as RawCard[])
    .map((c) => ({ front: c.front?.trim() ?? "", back: c.back?.trim() ?? "" }))
    .filter((c) => c.front && c.back);
}

const QUESTION_TYPES: QuestionType[] = ["multiple_choice", "true_false", "short_answer"];
type RawQuestion = { question_text?: string; question_type?: string; options?: unknown; correct_answer?: string; explanation?: string };

/** Quiz questions from a quiz response, dropping ones without text/answer; unknown types become short answer. */
export function toQuizQuestions(generated: unknown): QuizDraft["questions"] {
  const raw = (generated as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(raw)) return [];
  return (raw as RawQuestion[])
    .filter((q) => q.question_text?.trim() && q.correct_answer?.trim())
    .map((q) => ({
      questionText: q.question_text!.trim(),
      questionType: QUESTION_TYPES.includes(q.question_type as QuestionType) ? (q.question_type as QuestionType) : "short_answer",
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      correctAnswer: q.correct_answer!.trim(),
      explanation: q.explanation ?? null,
    }));
}
