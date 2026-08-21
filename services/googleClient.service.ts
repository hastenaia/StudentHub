"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";

/**
 * Client-side Google connection writes. Mirrors the auth.service.ts pattern —
 * components call the service, not Supabase directly, so providers/logging can
 * be swapped later without touching UI.
 */
export const googleClientService = {
  async disconnectGoogle(): Promise<ApiResult> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    // Only Classroom-sourced data belongs to the Google link — deleting it
    // cascades to its assignments + announcements. Calendar events have no FK
    // to courses, so they're removed explicitly.
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
