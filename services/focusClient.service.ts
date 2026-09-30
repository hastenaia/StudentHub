"use client";

import { createClient } from "@/lib/supabase/client";
import { gamificationClientService } from "@/services/gamificationClient.service";
import type { WithXp } from "@/types/gamification";
import { fail, ok, type ApiResult } from "@/types/api";

type LogSessionInput = {
  durationSeconds: number;
  kind: "focus" | "break";
  courseId?: string | null;
  taskId?: string | null;
  startedAt: string;
  endedAt: string;
};

type FocusSessionInsert = {
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  taskId?: string | null;
  courseId?: string | null;
};

/** Inserts one focus_sessions row for the signed-in user; returns the new id or an error message. */
async function insertFocusSession(row: FocusSessionInsert): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { data, error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    duration_minutes: row.durationMinutes,
    started_at: row.startedAt,
    ended_at: row.endedAt,
    // Omitted (undefined) ids fall back to the columns' null default.
    task_id: row.taskId,
    course_id: row.courseId,
  }).select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

export const focusClientService = {
  async startSession(durationMinutes: number, taskId?: string | null, courseId?: string | null): Promise<ApiResult> {
    const now = new Date();
    const endedAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    const saved = await insertFocusSession({ durationMinutes, startedAt: now.toISOString(), endedAt, taskId, courseId });
    if ("error" in saved) return fail(saved.error);
    return ok(`Focused for ${durationMinutes} minutes.`, undefined);
  },

  async logSession(input: LogSessionInput): Promise<WithXp<ApiResult>> {
    // Validate payload before hitting Supabase — prevents DB check violations and confusing errors.
    if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
      return fail("Invalid session duration.");
    }
    if (input.kind !== "focus" && input.kind !== "break") {
      return fail("Invalid session kind.");
    }
    const durationMinutes = Math.max(1, Math.round(input.durationSeconds / 60));
    // focus_sessions has no kind column and every reader (analytics, streaks, badges, wellness)
    // counts its rows as focus time, so a break must not be stored there.
    if (input.kind === "break") return ok(`Logged ${durationMinutes} min break.`);
    const saved = await insertFocusSession({ durationMinutes, startedAt: input.startedAt, endedAt: input.endedAt, taskId: input.taskId, courseId: input.courseId });
    if ("error" in saved) return fail(saved.error);
    return { ...ok(`Logged ${durationMinutes} min ${input.kind} session.`), xp: await gamificationClientService.awardFocus(saved.id) };
  },

  async logSessionMinutes(durationMinutes: number, opts?: { taskId?: string | null; courseId?: string | null; startedAt?: string; endedAt?: string }): Promise<WithXp<ApiResult>> {
    const startedAt = opts?.startedAt ?? new Date().toISOString();
    const endedAt = opts?.endedAt ?? new Date(new Date(startedAt).getTime() + durationMinutes * 60 * 1000).toISOString();
    const saved = await insertFocusSession({ durationMinutes, startedAt, endedAt, taskId: opts?.taskId, courseId: opts?.courseId });
    if ("error" in saved) return fail(saved.error);
    return { ...ok(`Focused for ${durationMinutes} minutes.`), xp: await gamificationClientService.awardFocus(saved.id) };
  },

  async completePomodoro(
    durationMinutes: number,
    startedAt: string,
    endedAt: string,
    taskId?: string | null,
    courseId?: string | null
  ): Promise<WithXp<ApiResult>> {
    const saved = await insertFocusSession({ durationMinutes, startedAt, endedAt, taskId, courseId });
    if ("error" in saved) return fail(saved.error);
    return { ...ok(`Pomodoro saved: ${durationMinutes} min focus.`), xp: await gamificationClientService.awardFocus(saved.id) };
  },
};
