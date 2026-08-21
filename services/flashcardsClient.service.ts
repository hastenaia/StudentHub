"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Flashcard, FlashcardDraft } from "@/types/study";

export const flashcardsClientService = {
  async createFlashcard(draft: FlashcardDraft): Promise<ApiResult<Flashcard>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data, error } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        front: draft.front.trim(),
        back: draft.back.trim(),
        tags: draft.tags,
        course_id: draft.courseId || null,
        note_id: draft.noteId || null,
      })
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Flashcard created.", data as unknown as Flashcard);
  },

  async updateFlashcard(id: string, draft: FlashcardDraft): Promise<ApiResult<Flashcard>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcards")
      .update({
        front: draft.front.trim(),
        back: draft.back.trim(),
        tags: draft.tags,
        course_id: draft.courseId || null,
        note_id: draft.noteId || null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Flashcard updated.", data as unknown as Flashcard);
  },

  async deleteFlashcard(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Flashcard deleted.");
  },

  async markKnown(id: string, known: boolean): Promise<ApiResult> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcards")
      .update({
        is_known: known,
        last_reviewed: new Date().toISOString(),
        correct_count: known ? undefined : undefined,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    // Increment counters via rpc-like logic: fetch current then update
    const current = data as unknown as { correct_count: number; incorrect_count: number };
    const patch: Record<string, unknown> = known
      ? { correct_count: (current.correct_count ?? 0) + 1 }
      : { incorrect_count: (current.incorrect_count ?? 0) + 1 };
    await supabase.from("flashcards").update(patch).eq("id", id);
    return ok(known ? "Marked as known" : "Marked as unknown");
  },
};
