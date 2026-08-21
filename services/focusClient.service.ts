"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";

export const focusClientService = {
  async startSession(durationMinutes: number, taskId?: string | null, courseId?: string | null): Promise<ApiResult> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const now = new Date();
    const endedAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    const { error } = await supabase.from("focus_sessions").insert({
      user_id: user.id,
      duration_minutes: durationMinutes,
      started_at: now.toISOString(),
      ended_at: endedAt,
      task_id: taskId ?? null,
      course_id: courseId ?? null,
    });
    if (error) return fail(error.message);
    return ok(`Focused for ${durationMinutes} minutes.`);
  },

  async logSession(durationMinutes: number): Promise<ApiResult> {
    return this.startSession(durationMinutes);
  }
};
