import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  content: z.string().max(10000, "Content is too long").optional().or(z.literal("")),
  favorite: z.boolean().optional(),
  tags: z.string().max(300, "Tags are too long").optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")).or(z.null()),
});
export type NoteFormValues = z.infer<typeof noteSchema>;

export const flashcardSchema = z.object({
  front: z.string().trim().min(1, "Front is required").max(500, "Front is too long"),
  back: z.string().trim().min(1, "Back is required").max(1000, "Back is too long"),
  tags: z.string().max(300).optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")).or(z.null()),
  noteId: z.string().optional().or(z.literal("")).or(z.null()),
});
export type FlashcardFormValues = z.infer<typeof flashcardSchema>;

export const quizQuestionSchema = z.object({
  questionText: z.string().trim().min(1, "Question is required").max(500),
  questionType: z.enum(["multiple_choice", "true_false", "short_answer"]),
  options: z.array(z.string().trim()).default([]),
  correctAnswer: z.string().trim().min(1, "Correct answer is required"),
  explanation: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const quizSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")).or(z.null()),
  questions: z.array(quizQuestionSchema).min(1, "Add at least one question"),
});
export type QuizFormValues = z.infer<typeof quizSchema>;
