import type { Course } from "@/types/courses";
import type { Database } from "@/types/database.types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

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
