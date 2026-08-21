"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import { scheduleRowToView } from "@/lib/scheduleView";
import type { ScheduleDraft, ScheduleEvent } from "@/types/schedule";
import type { Database } from "@/types/database.types";

type ScheduleRow = Database["public"]["Tables"]["schedule_events"]["Row"];

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
        course_id: draft.courseId || null,
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        location: draft.location?.trim() || null,
        event_type: draft.eventType,
        start_at: draft.startAt,
        end_at: draft.endAt,
        all_day: draft.allDay,
        color: draft.color || null,
      })
      .select()
      .single();

    if (error) return fail(error.message);
    // Need course map to resolve name/color — fetch course if needed
    let courseName: string | null = null;
    let courseColor: string | null = null;
    if (draft.courseId) {
      const { data: course } = await supabase
        .from("courses")
        .select("name, course_name, color")
        .eq("id", draft.courseId)
        .single();
      if (course) {
        courseName = (course as { course_name?: string | null; name: string }).course_name ?? course.name;
        courseColor = course.color;
      }
    }
    const courseMap = draft.courseId
      ? new Map([[draft.courseId, { name: courseName ?? "", color: courseColor }]])
      : new Map();
    return ok("Event created.", scheduleRowToView(data as ScheduleRow, courseMap as Map<string, { name: string; color: string | null }>));
  },

  async updateEvent(id: string, draft: ScheduleDraft): Promise<ApiResult<ScheduleEvent>> {
    const supabase = createClient();

    if (new Date(draft.endAt) <= new Date(draft.startAt)) {
      return fail("End time must be after start time.");
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .update({
        course_id: draft.courseId || null,
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        location: draft.location?.trim() || null,
        event_type: draft.eventType,
        start_at: draft.startAt,
        end_at: draft.endAt,
        all_day: draft.allDay,
        color: draft.color || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return fail(error.message);
    let courseName: string | null = null;
    let courseColor: string | null = null;
    if (draft.courseId) {
      const { data: course } = await supabase
        .from("courses")
        .select("name, course_name, color")
        .eq("id", draft.courseId)
        .single();
      if (course) {
        courseName = (course as { course_name?: string | null; name: string }).course_name ?? course.name;
        courseColor = course.color;
      }
    }
    const courseMap = draft.courseId
      ? new Map([[draft.courseId, { name: courseName ?? "", color: courseColor }]])
      : new Map();
    return ok("Event updated.", scheduleRowToView(data as ScheduleRow, courseMap as Map<string, { name: string; color: string | null }>));
  },

  async deleteEvent(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("schedule_events").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Event deleted.");
  },
};
