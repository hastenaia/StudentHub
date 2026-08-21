"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Note } from "@/types/study";

export interface NoteDraft {
  title: string;
  content: string | null;
  courseId?: string | null;
  favorite?: boolean;
  tags?: string[];
}

function rowToNote(row: Record<string, unknown>, courseMap?: Map<string, { name: string; color: string | null }>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string | null,
    favorite: (row.favorite as boolean) ?? false,
    tags: (row.tags as string[]) ?? [],
    courseId: row.course_id as string | null,
    courseName: row.course_id ? courseMap?.get(row.course_id as string)?.name ?? null : null,
    courseColor: row.course_id ? courseMap?.get(row.course_id as string)?.color ?? null : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const notesClientService = {
  async createNote(draft: NoteDraft): Promise<ApiResult<Note>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: draft.title.trim(),
        content: draft.content?.trim() || null,
        course_id: draft.courseId || null,
        favorite: draft.favorite ?? false,
        tags: draft.tags ?? [],
      })
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Note created.", rowToNote(data as Record<string, unknown>));
  },

  async updateNote(id: string, draft: NoteDraft): Promise<ApiResult<Note>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .update({
        title: draft.title.trim(),
        content: draft.content?.trim() || null,
        course_id: draft.courseId || null,
        favorite: draft.favorite,
        tags: draft.tags ?? [],
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return ok("Note updated.", rowToNote(data as Record<string, unknown>));
  },

  async deleteNote(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Note deleted.");
  },

  async toggleFavorite(id: string, favorite: boolean): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("notes").update({ favorite }).eq("id", id);
    if (error) return fail(error.message);
    return ok(favorite ? "Added to favorites" : "Removed from favorites");
  },
};
