import { createClient } from "@/lib/supabase/server";
import { getCoursesData } from "@/services/courses.service";
import { CoursesView } from "@/components/courses/CoursesView";
import type { Course } from "@/types/courses";

export const metadata = { title: "Courses — StudentHub" };

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  let courses: Course[] = [];
  let error: string | null = null;
  try {
    courses = await getCoursesData(user.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load courses.";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Courses</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your enrolled courses.</p>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Courses</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your courses — add, edit, search, and organize.
        </p>
      </div>
      <CoursesView initialCourses={courses} />
    </div>
  );
}
