import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CourseProgressBar } from "@/components/courses/CourseProgressBar";
import type { CourseSnapshotItem } from "@/services/dashboard.service";

interface Props { courses: CourseSnapshotItem[] }

/** Active courses with instructor and weighted 0–100 progress (FR-03 / FR-04). */
export function CourseSnapshot({ courses }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-brand-royal" /> Courses
          </span>
          <Link href="/dashboard/courses" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No courses yet — add one or sync Google Classroom.</p>
        ) : (
          <ul className="space-y-2">
            {courses.slice(0, 6).map((course) => (
              <li key={course.id} className="space-y-1.5 rounded-md border border-gray-100 bg-white px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color || "#0033A0" }}
                    aria-hidden
                  />
                  <p className="truncate text-sm font-medium text-brand-dark">{course.name}</p>
                </div>
                {course.instructor && (
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="h-3 w-3 shrink-0" /> <span className="truncate">{course.instructor}</span>
                  </p>
                )}
                {course.progress && <CourseProgressBar progress={course.progress} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
