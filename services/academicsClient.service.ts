"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";

/**
 * Client-side academic writes: manual course CRUD and Google disconnection.
 * Mirrors the auth.service.ts pattern — components call the service, not
 * Supabase directly, so providers/logging can be swapped later without
 * touching UI.
 */

export interface ManualCourseInput {
  name: string;
  section?: string | null;
  room?: string | null;
  creditHours: number;
}

export interface ManualCourseUpdate {
  id: string;
  name?: string;
  creditHours?: number;
}

export const academicsClientService = {
  async addManualCourse(input: ManualCourseInput): Promise<ApiResult> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in to add a course.");

    const { error } = await supabase.from("courses").insert({
      user_id: user.id,
      source: "manual",
      name: input.name,
      section: input.section ?? null,
      room: input.room ?? null,
      credit_hours: input.creditHours,
      archived: false,
    });
    return error ? fail(error.message) : ok("Course added.");
  },

  async updateManualCourse(input: ManualCourseUpdate): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase
      .from("courses")
      .update({
        name: input.name,
        credit_hours: input.creditHours,
      })
      .eq("id", input.id)
      .eq("source", "manual");
    return error ? fail(error.message) : ok("Course updated.");
  },

  async deleteCourse(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    return error ? fail(error.message) : ok("Course removed.");
  },

  async disconnectGoogle(): Promise<ApiResult> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    // Only Classroom-sourced data belongs to the Google link — deleting it
    // cascades to its assignments + announcements. Manual courses are kept.
    // Calendar events have no FK to courses, so they're removed explicitly.
    const { error: coursesError } = await supabase
      .from("courses")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "classroom");
    if (coursesError) return fail(coursesError.message);

    const { error: eventsError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", user.id);
    if (eventsError) return fail(eventsError.message);

    const { error } = await supabase.from("google_accounts").delete().eq("user_id", user.id);
    return error ? fail(error.message) : ok("Google account disconnected.");
  },
};