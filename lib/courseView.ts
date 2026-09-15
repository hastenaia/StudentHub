import type { Course } from "@/types/courses";
import type { Database } from "@/types/database.types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

export interface CourseOptionLike {
  id: string;
  name: string;
  color: string | null;
}

type CourseOptionRow = { id: string; name: string; course_name?: string | null; color?: string | null };

export function toCourseOptions(rows?: CourseOptionRow[] | null): CourseOptionLike[] {
  return (rows ?? []).map((c) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color ?? null,
  }));
}

export function courseRowToView(row: CourseRow): Course {
  return {
    id: row.id,
    course_code: row.course_code ?? null,
    course_name: row.course_name ?? row.name,
    instructor: row.instructor ?? row.teacher_name ?? null,
    description: row.description ?? null,
    room: row.room ?? null,
    color: row.color ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: row.source,
    google_course_id: row.google_course_id ?? null,
  };
}
