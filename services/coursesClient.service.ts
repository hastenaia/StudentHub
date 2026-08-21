"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Course, CourseDraft } from "@/types/courses";
import { courseRowToView } from "@/lib/courseView";
import type { Database } from "@/types/database.types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

export const coursesClientService = {
  async createCourse(draft: CourseDraft): Promise<ApiResult<Course>> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    const payload = {
      user_id: user.id,
      source: "manual" as const,
      // Legacy + canonical double-write for compatibility
      name: draft.course_name.trim(),
      course_name: draft.course_name.trim(),
      course_code: draft.course_code.trim() || null,
      instructor: draft.instructor.trim() || null,
      teacher_name: draft.instructor.trim() || null,
      description: draft.description.trim() || null,
      room: draft.room.trim() || null,
      color: draft.color.trim() || null,
      archived: false,
    };

    const { data, error } = await supabase.from("courses").insert(payload).select().single();
    if (error) return fail(error.message);
    return ok("Course created.", courseRowToView(data as CourseRow));
  },

  async updateCourse(id: string, draft: CourseDraft): Promise<ApiResult<Course>> {
    const supabase = createClient();

    const payload = {
      name: draft.course_name.trim(),
      course_name: draft.course_name.trim(),
      course_code: draft.course_code.trim() || null,
      instructor: draft.instructor.trim() || null,
      teacher_name: draft.instructor.trim() || null,
      description: draft.description.trim() || null,
      room: draft.room.trim() || null,
      color: draft.color.trim() || null,
    };

    const { data, error } = await supabase
      .from("courses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return fail(error.message);
    return ok("Course updated.", courseRowToView(data as CourseRow));
  },

  async deleteCourse(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Course deleted.");
  },

  async getCourse(id: string): Promise<ApiResult<Course>> {
    const supabase = createClient();
    const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
    if (error) return fail(error.message);
    return ok("Course fetched.", courseRowToView(data as CourseRow));
  },
};
