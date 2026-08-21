import { BookOpen, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  buildProjection,
  computeGpa,
  neededAverage,
  pointsToLetter,
  scaleTop,
  type AssignmentGradeInput,
  type GpaCourseInput,
  type ProjectionView,
} from "@/lib/gpa";
import { getAcademicSettings } from "@/services/academics.service";
import { GpaProjectionCard } from "@/components/dashboard/GpaProjectionCard";
import { CourseTargetEditor } from "@/components/grades/CourseTargetEditor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GpaViewModel } from "@/types/academics";

export const metadata = { title: "Grades — StudentHub" };

const DEFAULT_TARGET_PCT = 90;

function projectionMessage(view: ProjectionView): string {
  switch (view.status) {
    case "no-data":
      return "No graded work yet — projections appear once assignments have points.";
    case "complete":
      return "All work is graded — the grade above is final for this term.";
    case "secured":
      return "Target already secured regardless of remaining work.";
    case "unreachable":
      return "Target isn't reachable from here — lower it below.";
    case "needs":
      return `Need ${view.requiredPct?.toFixed(0)}% on the remaining ${view.remainingMax} pts to hit ${view.targetPct}%.`;
  }
}

export default async function GradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const [settings, coursesRes, assignmentsRes] = await Promise.all([
    getAcademicSettings(user.id),
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true }),
  ]);

  const courseRows = coursesRes.data ?? [];
  const assignmentRows = assignmentsRes.data ?? [];
  const scale = settings.gradeScale;

  const gpaInputs: GpaCourseInput[] = courseRows.map((course) => ({
    id: course.id,
    name: course.name,
    creditHours: Number(course.credit_hours ?? 0),
    source: course.source,
    manualGrade: course.manual_grade != null ? Number(course.manual_grade) : null,
    assignments:
      course.source === "classroom"
        ? assignmentRows
            .filter((a) => a.course_id === course.id)
            .map((a) => ({
              earned: a.grade != null ? Number(a.grade) : null,
              maxPoints: Number(a.max_points ?? 0),
            }))
        : [],
  }));

  const gpaSummary = computeGpa(gpaInputs, scale);
  const top = scaleTop(scale);
  const remainingCredits = gpaSummary.totalCredits - gpaSummary.completedCredits;
  const needed =
    remainingCredits > 0
      ? neededAverage(settings.targetGpa, gpaSummary.gpa, gpaSummary.completedCredits, remainingCredits)
      : null;

  const gpa: GpaViewModel = {
    gpa: gpaSummary.gpa,
    completedCredits: gpaSummary.completedCredits,
    totalCredits: gpaSummary.totalCredits,
    gradedCourseCount: gpaSummary.gradedCourseCount,
    courseCount: gpaSummary.courseCount,
    neededAverage: needed != null ? Math.max(needed, 0) : null,
    targetUnreachable: needed != null && needed > top,
  };

  const resultsById = new Map(gpaSummary.courses.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Grades & GPA</h2>
        <p className="mt-1 text-sm text-gray-500">
          Per-course grades and what you still need to hit your goals.
        </p>
      </div>

      <GpaProjectionCard gpa={gpa} targetGpa={settings.targetGpa} />

      {courseRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
              <GraduationCap className="h-6 w-6 text-brand-royal" />
            </div>
            <p className="text-sm text-gray-500">
              No courses yet. Sync your Google Classroom or add a course in Settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {courseRows.map((course) => {
            const result = resultsById.get(course.id);
            const assignments: AssignmentGradeInput[] =
              course.source === "classroom"
                ? assignmentRows
                    .filter((a) => a.course_id === course.id)
                    .map((a) => ({
                      earned: a.grade != null ? Number(a.grade) : null,
                      maxPoints: Number(a.max_points ?? 0),
                    }))
                : [];
            const targetPct = course.target_pct != null ? Number(course.target_pct) : DEFAULT_TARGET_PCT;
            const projection = buildProjection(assignments, targetPct);
            const isManual = course.source === "manual";

            return (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{course.name}</p>
                      <p className="text-xs font-normal text-gray-500">
                        {course.section || "Course"} · {Number(course.credit_hours ?? 0)} credits
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-royal">
                      {result?.gradePoints != null
                        ? pointsToLetter(result.gradePoints, scale) ?? result.gradePoints.toFixed(2)
                        : "No grade"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result?.progress != null && (
                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-brand-royal"
                          style={{ width: `${Math.round(result.progress * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {Math.round(result.progress * 100)}% of possible points earned
                      </p>
                    </div>
                  )}

                  {!isManual ? (
                    <>
                      <p className="text-sm text-gray-600">{projectionMessage(projection)}</p>
                      <CourseTargetEditor courseId={course.id} targetPct={course.target_pct} />
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <BookOpen className="h-3.5 w-3.5" /> Manually tracked — no projection needed.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
