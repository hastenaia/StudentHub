"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import { scheduleRowToView } from "@/lib/scheduleView";
import type { ScheduleDraft, ScheduleEvent } from "@/types/schedule";
import type { Database } from "@/types/database.types";
import { trimOrNull } from "@/utils/text";

type ScheduleRow = Database["public"]["Tables"]["schedule_events"]["Row"];
type BrowserClient = ReturnType<typeof createClient>;

/** Columns shared by insert and update. */
function draftToColumns(draft: ScheduleDraft) {
  return {
    course_id: draft.courseId || null,
    title: draft.title.trim(),
    description: trimOrNull(draft.description),
    location: trimOrNull(draft.location),
    event_type: draft.eventType,
    start_at: draft.startAt,
    end_at: draft.endAt,
    all_day: draft.allDay,
    color: draft.color || null,
  };
}

/** Maps a saved row to the view model, looking up the course's display name/color if one is set. */
async function toEventView(supabase: BrowserClient, row: ScheduleRow, courseId: string | null | undefined): Promise<ScheduleEvent> {
  const courseMap = new Map<string, { name: string; color: string | null }>();
  if (courseId) {
    const { data: course } = await supabase.from("courses").select("name, course_name, color").eq("id", courseId).single();
    if (course) courseMap.set(courseId, { name: course.course_name ?? course.name, color: course.color });
  }
  return scheduleRowToView(row, courseMap);
}

export const scheduleClientService = {
  async createEvent(draft: ScheduleDraft): Promise<ApiResult<ScheduleEvent>> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    if (new Date(draft.endAt) <= new Date(draft.startAt)) {
      return fail("End time must be after start time.");
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        user_id: user.id,
        ...draftToColumns(draft),
      })
      .select()
      .single();

    if (error) return fail(error.message);
    return ok("Event created.", await toEventView(supabase, data as ScheduleRow, draft.courseId));
  },

  async updateEvent(id: string, draft: ScheduleDraft): Promise<ApiResult<ScheduleEvent>> {
    const supabase = createClient();

    if (new Date(draft.endAt) <= new Date(draft.startAt)) {
      return fail("End time must be after start time.");
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .update(draftToColumns(draft))
      .eq("id", id)
      .select()
      .single();

    if (error) return fail(error.message);
    return ok("Event updated.", await toEventView(supabase, data as ScheduleRow, draft.courseId));
  },

  async deleteEvent(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("schedule_events").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Event deleted.");
  },
};
