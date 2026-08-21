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
    const { data: current, error: fetchError } = await supabase
      .from("flashcards")
      .select("correct_count, incorrect_count")
      .eq("id", id)
      .single();
    if (fetchError) return fail(fetchError.message);
    const patch = known
      ? {
          is_known: true,
          last_reviewed: new Date().toISOString(),
          correct_count: ((current as { correct_count: number }).correct_count ?? 0) + 1,
        }
      : {
          is_known: false,
          last_reviewed: new Date().toISOString(),
          incorrect_count: ((current as { incorrect_count: number }).incorrect_count ?? 0) + 1,
        };
    const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
    if (error) return fail(error.message);
    return ok(known ? "Marked as known" : "Marked as unknown");
  },
};
