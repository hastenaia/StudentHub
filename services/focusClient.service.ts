"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";

/**
 * Client-side writes for the Focus Timer. Components call the service, not
 * Supabase directly, so providers/logging can be swapped later.
 */

export interface LogSessionInput {
  courseId: string | null;
  taskId: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  kind: "focus" | "break";
}

export const focusClientService = {
  async logSession(input: LogSessionInput): Promise<ApiResult> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in to log a session.");

    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      course_id: input.courseId,
      task_id: input.taskId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_seconds: input.durationSeconds,
      kind: input.kind,
    });
    return error ? fail(error.message) : ok("Session logged.");
  },
};
