"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Quiz, QuizDraft, QuizAttempt } from "@/types/study";
import { quizDraftToQuestionRows, quizRowToView } from "@/lib/quizView";
import { trimOrNull } from "@/utils/text";

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
        description: trimOrNull(draft.description),
        course_id: draft.courseId,
      })
      .select()
      .single();
    if (error) return fail(error.message);
    const { data: questions, error: qError } = await supabase.from("quiz_questions").insert(quizDraftToQuestionRows(quiz.id, draft)).select();
    if (qError) {
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return fail(qError.message);
    }
    return ok("Quiz created.", quizRowToView(quiz, questions));
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
