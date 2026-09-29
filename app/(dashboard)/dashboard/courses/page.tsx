import { createClient } from "@/lib/supabase/server";
import { getCoursesData } from "@/services/courses.service";
import { CoursesView } from "@/components/courses/CoursesView";
import type { Course } from "@/types/courses";
import { PageHeader, PageLoadError } from "@/components/common/PageHeader";

export const metadata = { title: "Courses — StudentHub" };

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view courses.</p>;
  }

  let courses: Course[] = [];
  let error: string | null = null;
  try {
    courses = await getCoursesData(user.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load courses.";
  }

  if (error) {
    return <PageLoadError title="Courses" description="Manage your enrolled courses." error={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="Manage your courses — add, edit, search, and organize." />
      <CoursesView initialCourses={courses} />
    </div>
  );
}
