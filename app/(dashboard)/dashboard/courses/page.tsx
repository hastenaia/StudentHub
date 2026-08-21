import { BookOpen, Users, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDueLabel, formatDate } from "@/utils/date";
import type { DashboardAssignment } from "@/types/academics";

export const metadata = { title: "Courses — StudentHub" };

interface CourseView {
  id: string;
  name: string;
  section: string | null;
  room: string | null;
  teacherName: string | null;
  color: string | null;
  source: string;
  creditHours: number;
  createdAt: string;
  upcomingAssignments: DashboardAssignment[];
  assignmentCount: number;
}

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const [coursesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at"),
    supabase.from("assignments").select("*").eq("user_id", user.id).order("due_at", { ascending: true }),
  ]);

  const courseRows = coursesRes.data ?? [];
  const assignmentRows = assignmentsRes.data ?? [];
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const courses: CourseView[] = courseRows.map((course) => {
    const related = assignmentRows.filter((a) => a.course_id === course.id);
    const upcoming = related
      .filter((a) => a.due_at && new Date(a.due_at).getTime() >= now)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        title: a.title,
        courseName: course.name,
        courseId: course.id,
        dueAt: a.due_at,
        description: a.description,
        submitted: a.submitted,
      }));

    return {
      id: course.id,
      name: course.name,
      section: course.section,
      room: course.room,
      teacherName: course.teacher_name,
      color: course.color,
      source: course.source,
      creditHours: Number(course.credit_hours ?? 0),
      createdAt: course.created_at,
      upcomingAssignments: upcoming,
      assignmentCount: related.length,
    };
  });

  const classroomCount = courses.filter((c) => c.source === "classroom").length;
  const manualCount = courses.filter((c) => c.source === "manual").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Courses</h2>
        <p className="mt-1 text-sm text-gray-500">
          {courses.length === 0
            ? "Your enrolled and manually tracked courses will appear here."
            : `${courses.length} course${courses.length === 1 ? "" : "s"} · ${classroomCount} from Classroom · ${manualCount} manual`}
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
              <BookOpen className="h-6 w-6 text-brand-royal" />
            </div>
            <p className="text-sm font-medium text-brand-dark">No courses yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              Sync your Google Classroom from the dashboard or add a manual course in Settings to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base">{course.name}</p>
                    <p className="truncate text-xs font-normal text-gray-500">
                      {course.section || "Course"} {course.teacherName ? `· ${course.teacherName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      course.source === "classroom"
                        ? "bg-brand-royal/10 text-brand-royal"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {course.source === "classroom" ? "Classroom" : "Manual"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {course.creditHours} credits
                  </span>
                  {course.room && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {course.room}
                    </span>
                  )}
                  {course.section && course.room ? null : null}
                  {course.teacherName && !course.section && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {course.teacherName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-brand-gray px-2 py-1 text-gray-600">
                    {course.assignmentCount} assignment{course.assignmentCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-gray-400">Added {formatDate(course.createdAt)}</span>
                </div>

                {course.upcomingAssignments.length > 0 ? (
                  <div className="mt-1 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">Upcoming</p>
                    <ul className="space-y-1.5">
                      {course.upcomingAssignments.map((a) => (
                        <li key={a.id} className="flex justify-between gap-2 text-xs">
                          <span className="truncate text-gray-700">{a.title}</span>
                          <span className="shrink-0 text-gray-400">{formatDueLabel(a.dueAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-1 border-t border-gray-100 pt-3 text-xs text-gray-400">
                    No upcoming assignments
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
