import { GraduationCap, Target } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpaViewModel } from "@/types/academics";

interface GpaProjectionCardProps {
  gpa: GpaViewModel;
  targetGpa: number;
}

/**
 * GPA + grade-goal projection. Shows the weighted GPA and, when there's still
 * ungraded credit remaining, the average needed on it to hit the target GPA.
 * Also flags the "already secured" and "unreachable" edge cases.
 */
export function GpaProjectionCard({ gpa, targetGpa }: GpaProjectionCardProps) {
  let projectionText: string;

  if (gpa.gpa == null) {
    projectionText = "No grades yet — sync your classes or add courses to start projecting.";
  } else if (gpa.gradedCourseCount >= gpa.courseCount) {
    projectionText = "All courses are graded — the GPA above is final for this term.";
  } else if (gpa.targetUnreachable || (gpa.neededAverage != null && gpa.neededAverage > 4)) {
    projectionText =
      "Your target isn't reachable with the remaining graded work — adjust it in Settings.";
  } else if (gpa.neededAverage != null && gpa.neededAverage <= 0) {
    projectionText = `Target ${targetGpa.toFixed(2)} is already secured regardless of future grades.`;
  } else if (gpa.neededAverage != null) {
    projectionText = `You need an average of ${gpa.neededAverage.toFixed(2)} on the remaining ${(gpa.totalCredits - gpa.completedCredits).toFixed(0)} credits to hit ${targetGpa.toFixed(2)}.`;
  } else {
    projectionText = "Not enough data to project yet.";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand-royal" /> GPA & goals
        </CardTitle>
        <Link
          href="/dashboard/settings"
          className="text-xs font-medium text-brand-royal hover:underline"
        >
          Adjust target
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-4xl font-bold text-brand-dark">
              {gpa.gpa != null ? gpa.gpa.toFixed(2) : "—"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {gpa.gradedCourseCount} of {gpa.courseCount} courses graded ·{" "}
              {gpa.completedCredits.toFixed(0)}/{gpa.totalCredits.toFixed(0)} credits
            </p>
          </div>
          <div className="flex items-center gap-1.5 pb-1 text-sm font-medium text-green-600">
            <Target className="h-4 w-4" />
            Target {targetGpa.toFixed(2)}
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">{projectionText}</p>
      </CardContent>
    </Card>
  );
}