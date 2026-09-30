import { classroomDateToIso } from "@/lib/google/tokens";
import type { Database } from "@/types/database.types";
import type { GoogleCourseWork, GoogleStudentSubmission } from "@/types/google";

type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];

/** Submission states that mean the student has handed the work in. */
const SUBMITTED_STATES = new Set(["TURNED_IN", "RETURNED"]);

function positivePoints(maxPoints: number | undefined): number | null {
  return maxPoints && maxPoints > 0 ? maxPoints : null;
}

/** Grade/submitted/state from the student's submission (absent → ungraded, not submitted). */
function submissionFields(mine: GoogleStudentSubmission | undefined): Pick<AssignmentInsert, "grade" | "submitted" | "state"> {
  if (!mine) return { grade: null, submitted: false, state: null };
  return { grade: mine.assignedGrade ?? null, submitted: SUBMITTED_STATES.has(mine.state), state: mine.state };
}

/**
 * Map one course's Classroom courseWork (+ the student's submissions) to
 * `assignments` upsert rows. `weight` is never written, so user edits survive.
 *
 * `submissions === null` means that fetch failed: grade/submitted/state are
 * left out so the upsert keeps the stored values instead of wiping them.
 */
export function assignmentRowsForCourse(
  userId: string,
  courseId: string,
  courseWork: GoogleCourseWork[],
  submissions: GoogleStudentSubmission[] | null
): AssignmentInsert[] {
  const byWorkId = new Map((submissions ?? []).map((s) => [s.courseWorkId, s]));
  return courseWork.map((cw) => {
    const row: AssignmentInsert = {
      user_id: userId,
      course_id: courseId,
      google_course_work_id: cw.id,
      title: cw.title || "Untitled assignment",
      description: cw.description ?? null,
      due_at: classroomDateToIso(cw.dueDate, cw.dueTime),
      max_points: positivePoints(cw.maxPoints),
    };
    return submissions === null ? row : { ...row, ...submissionFields(byWorkId.get(cw.id)) };
  });
}

/**
 * Stored Classroom work ids to delete after a sync: not seen this time, and not
 * in a course whose courseWork fetch failed (those rows are kept as-is).
 */
export function staleCourseWorkIds(
  existing: { google_course_work_id: string | null; course_id: string | null }[],
  syncedWorkIds: Set<string>,
  failedCourseIds: Set<string>
): string[] {
  const stale: string[] = [];
  for (const r of existing) {
    const id = r.google_course_work_id;
    if (!id || syncedWorkIds.has(id)) continue;
    if (r.course_id && failedCourseIds.has(r.course_id)) continue;
    stale.push(id);
  }
  return stale;
}
