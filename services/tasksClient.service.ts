"use client";

import { createClient } from "@/lib/supabase/client";
import { nextRecurrence } from "@/lib/scheduling";
import { fail, ok, type ApiResult } from "@/types/api";
import type { RecurrenceFreq, TaskDraft, TaskStatus } from "@/types/tasks";
import type { Database } from "@/types/database.types";

/**
 * Client-side task writes for the To-Do Tracker. Mirrors the academics client
 * service pattern — components go through this layer, never Supabase directly.
 * Mutations that change a row return it so the UI can update optimistically.
 */

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

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
        recur_until: draft.recurUntil,
        sort_order: 0,
      })
      .select()
      .single();
    return error ? fail(error.message) : ok("Task created.", data);
  },

  async updateTask(id: string, draft: TaskDraft): Promise<ApiResult<TaskRow>> {
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
        recur_until: draft.recurUntil,
      })
      .eq("id", id)
      .select()
      .single();
    return error ? fail(error.message) : ok("Task updated.", data);
  },

  async deleteTask(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    return error ? fail(error.message) : ok("Task deleted.");
  },

  /** Move a task between kanban columns / reorder within a column. */
  async moveTask(id: string, status: TaskStatus, sortOrder: number): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        status,
        sort_order: sortOrder,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    return error ? fail(error.message) : ok();
  },

  /**
   * Complete a task. Recurring tasks advance to their next due date (and drop
   * back to "to do") instead of closing; the updated row is returned so the UI
   * reflects the new due date immediately.
   */
  async completeTask(id: string): Promise<ApiResult<TaskRow>> {
    const supabase = createClient();
    const { data: row } = await supabase
      .from("tasks")
      .select("due_at, recurrence_freq, recurrence_interval, recur_until")
      .eq("id", id)
      .maybeSingle();
    if (!row) return fail("Task not found.");

    const nextDue = row.recurrence_freq
      ? nextRecurrence(
          row.due_at,
          row.recurrence_freq as RecurrenceFreq,
          row.recurrence_interval,
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
      return error ? fail(error.message) : ok("Done — next occurrence scheduled.", data);
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return error ? fail(error.message) : ok("Task completed.", data);
  },
};
