"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Flashcard, FlashcardDraft } from "@/types/study";
import { flashcardDraftToColumns, flashcardReviewPatch, flashcardRowToView } from "@/lib/flashcardView";

export const flashcardsClientService = {
  async createFlashcard(draft: FlashcardDraft): Promise<ApiResult<Flashcard>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data, error } = await supabase
      .from("flashcards")
      .insert({ ...flashcardDraftToColumns(draft), user_id: user.id })
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Flashcard created.", flashcardRowToView(data));
  },

  async updateFlashcard(id: string, draft: FlashcardDraft): Promise<ApiResult<Flashcard>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("flashcards")
      .update(flashcardDraftToColumns(draft))
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Flashcard updated.", flashcardRowToView(data));
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
    const patch = flashcardReviewPatch(current, known, new Date());
    const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
    if (error) return fail(error.message);
    return ok(known ? "Marked as known" : "Marked as unknown");
  },
};
