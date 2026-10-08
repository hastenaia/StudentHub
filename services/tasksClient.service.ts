"use client";

import { createClient } from "@/lib/supabase/client";
import { nextRecurrence } from "@/lib/scheduling";
import { gamificationClientService } from "@/services/gamificationClient.service";
import type { AwardResult, WithXp } from "@/types/gamification";
import { fail, ok, type ApiResult } from "@/types/api";
import type { RecurrenceFreq, TaskDraft, TaskStatus } from "@/types/tasks";
import type { Database } from "@/types/database.types";

/**
 * Client-side task writes for the To-Do Tracker. Mirrors the academics client
 * service pattern — components go through this layer, never Supabase directly.
 * Mutations that change a row return it so the UI can update optimistically.
 */

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
/** XP for a task that just became done; the server decides the points and dedupes. */
function awardIfDone(id: string, status: TaskStatus): Promise<AwardResult | null> {
  return status === "done" ? gamificationClientService.awardTask(id) : Promise.resolve(null);
}

export const tasksClientService = {
  async createTask(draft: TaskDraft): Promise<ApiResult<TaskRow>> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        course_id: draft.courseId,
        title: draft.title,
        description: draft.description ?? null,
        status: draft.status,
        priority: draft.priority,
        tags: draft.tags,
        due_at: draft.dueAt,
        estimate_minutes: draft.estimateMinutes,
        recurrence_freq: draft.recurrenceFreq,
        recurrence_interval: draft.recurrenceInterval,
        recurrence_days: draft.recurrenceDays,
        recur_until: draft.recurUntil,
        sort_order: 0,
      })
      .select()
      .single();
    return error ? fail(error.message) : ok("Task created.", data);
  },

  async updateTask(id: string, draft: TaskDraft): Promise<WithXp<ApiResult<TaskRow>>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({
        course_id: draft.courseId,
        title: draft.title,
        description: draft.description ?? null,
        status: draft.status,
        priority: draft.priority,
        tags: draft.tags,
        due_at: draft.dueAt,
        estimate_minutes: draft.estimateMinutes,
        recurrence_freq: draft.recurrenceFreq,
        recurrence_interval: draft.recurrenceInterval,
        recurrence_days: draft.recurrenceDays,
        recur_until: draft.recurUntil,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return { ...ok("Task updated.", data), xp: await awardIfDone(id, draft.status) };
  },

  async deleteTask(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    return error ? fail(error.message) : ok("Task deleted.");
  },

  /** Move a task between kanban columns / reorder within a column. */
  async moveTask(id: string, status: TaskStatus, sortOrder: number): Promise<WithXp<ApiResult>> {
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        status,
        sort_order: sortOrder,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return fail(error.message);
    return { ...ok(), xp: await awardIfDone(id, status) };
  },

  /**
   * Complete a task. Recurring tasks advance to their next due date (and drop
   * back to "to do") instead of closing; the updated row is returned so the UI
   * reflects the new due date immediately.
   */
  async completeTask(id: string): Promise<WithXp<ApiResult<TaskRow>>> {
    const supabase = createClient();
    const { data: row } = await supabase
      .from("tasks")
      .select("due_at, recurrence_freq, recurrence_interval, recurrence_days, recur_until")
      .eq("id", id)
      .maybeSingle();
    if (!row) return fail("Task not found.");

    const nextDue = row.recurrence_freq
      ? nextRecurrence(
          row.due_at,
          row.recurrence_freq as RecurrenceFreq,
          row.recurrence_interval,
          row.recurrence_days,
          row.recur_until
        )
      : null;

    if (nextDue) {
      const { data, error } = await supabase
        .from("tasks")
        .update({ due_at: nextDue, status: "todo", completed_at: null })
        .eq("id", id)
        .select()
        .single();
      if (error) return fail(error.message);
      // A recurring task rolls forward rather than staying done; the server caps it at one award per day.
      return { ...ok("Done — next occurrence scheduled.", data), xp: await gamificationClientService.awardTask(id) };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return fail(error.message);
    return { ...ok("Task completed.", data), xp: await gamificationClientService.awardTask(id) };
  },
};
