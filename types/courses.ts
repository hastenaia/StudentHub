export interface Course {
  id: string;
  course_code: string | null;
  course_name: string;
  instructor: string | null;
  description: string | null;
  room: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  // Legacy/compat fields kept for Classroom integration
  source: "classroom" | "manual";
  google_course_id: string | null;
}

export interface CourseDraft {
  course_code: string;
  course_name: string;
  instructor: string;
  description: string;
  room: string;
  color: string;
}

export interface CoursesViewData {
  courses: Course[];
}
