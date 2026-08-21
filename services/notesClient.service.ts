"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";

export interface NoteDraft { title: string; content: string | null; courseId?: string | null }

export const notesClientService = {
  async createNote(draft: NoteDraft): Promise<ApiResult> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: draft.title.trim(),
      content: draft.content?.trim() || null,
      course_id: draft.courseId || null,
    });
    if (error) return fail(error.message);
    return ok("Note created.");
  }
};
