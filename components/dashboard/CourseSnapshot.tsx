import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardCourse } from "@/types/academics";
import { pointsToLetter, type GradeScale } from "@/lib/gpa";

interface CourseSnapshotProps {
  courses: DashboardCourse[];
  gradeScale: GradeScale;
}

/**
 * Grid of the student's courses with per-course progress. Classroom courses
 * show a progress bar (earned/possible points); manual courses show their
 * grade. Courses without a grade say "No grade yet" instead of showing 0.
 */
export function CourseSnapshot({ courses, gradeScale }: CourseSnapshotProps) {
  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
            <BookOpen className="h-6 w-6 text-brand-royal" />
          </div>
          <p className="text-sm text-gray-500">
            No courses yet. Sync your Google Classroom or add a course in Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-royal" /> Course snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-lg border border-gray-100 bg-brand-gray/40 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-dark">{course.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {course.section || "Course"} · {course.creditHours} credits
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-brand-royal">
                  {course.gradePoints != null
                    ? pointsToLetter(course.gradePoints, gradeScale) ?? course.gradePoints.toFixed(2)
                    : "No grade"}
                </span>
              </div>

              {course.progress != null && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-brand-royal"
                      style={{ width: `${Math.round(course.progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {Math.round(course.progress * 100)}% of possible points earned
                  </p>
                </div>
              )}

              {course.upcomingAssignments.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
                  {course.upcomingAssignments.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate text-gray-600">{a.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}