"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Quiz, QuizDraft, QuizAttempt } from "@/types/study";

export const quizzesClientService = {
  async createQuiz(draft: QuizDraft): Promise<ApiResult<Quiz>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        user_id: user.id,
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        course_id: draft.courseId || null,
      })
      .select()
      .single();
    if (error || !quiz) return fail(error?.message ?? "Failed to create quiz");
    const quizId = (quiz as { id: string }).id;
    const inserts = draft.questions.map((q, idx) => ({
      quiz_id: quizId,
      question_text: q.questionText.trim(),
      question_type: q.questionType,
      options: q.questionType === "multiple_choice" ? q.options : null,
      correct_answer: q.correctAnswer.trim(),
      explanation: q.explanation?.trim() || null,
      position: idx,
    }));
    const { error: qError } = await supabase.from("quiz_questions").insert(inserts);
    if (qError) {
      await supabase.from("quizzes").delete().eq("id", quizId);
      return fail(qError.message);
    }
    return ok("Quiz created.", quiz as unknown as Quiz);
  },

  async deleteQuiz(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Quiz deleted.");
  },

  async submitAttempt(quizId: string, answers: { questionId: string; answer: string }[], score: number, total: number): Promise<ApiResult<QuizAttempt>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        answers: answers as unknown as never,
        score,
        total,
      })
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Attempt saved.", data as unknown as QuizAttempt);
  },
};
