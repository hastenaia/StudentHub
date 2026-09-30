/**
 * Weighted 0–100 course progress (FR-04). Pure math, no GPA.
 *
 * A course's score is the weighted mean of `grade / max_points` over its
 * scorable assignments, as a rounded percentage clamped to 0–100. Rows without
 * a positive `max_points` (ungraded Classroom work) never count.
 */

import type { CourseProgress } from "@/types/courses";

export interface ProgressInput {
  grade: number | null;
  max_points: number | null;
  weight: number | null;
}

/** Share of points assumed on remaining work for the projection. */
const DEFAULT_ASSUMED_RATIO = 0.8;

function isScorable(a: ProgressInput): boolean {
  return a.max_points != null && a.max_points > 0;
}

function weightOf(a: ProgressInput): number {
  return a.weight != null && a.weight > 0 ? a.weight : 1;
}

function toPercent(num: number, den: number): number {
  return Math.min(100, Math.max(0, Math.round((num / den) * 100)));
}

/** Current 0–100 score over graded work, or null when nothing is graded yet. */
export function courseProgress(assignments: ProgressInput[]): number | null {
  let num = 0;
  let den = 0;
  for (const a of assignments) {
    if (a.grade == null || !isScorable(a)) continue;
    const w = weightOf(a);
    num += (a.grade / a.max_points!) * w;
    den += w;
  }
  return den > 0 ? toPercent(num, den) : null;
}

/** Projected 0–100 score, assuming `assumeForUngraded` (0–1) on ungraded work. */
export function projectedProgress(
  assignments: ProgressInput[],
  assumeForUngraded = DEFAULT_ASSUMED_RATIO
): number | null {
  let num = 0;
  let den = 0;
  for (const a of assignments) {
    if (!isScorable(a)) continue;
    const w = weightOf(a);
    num += (a.grade != null ? a.grade / a.max_points! : assumeForUngraded) * w;
    den += w;
  }
  return den > 0 ? toPercent(num, den) : null;
}

/** Groups assignment rows by course; courses with no graded work are omitted. */
export function progressByCourse(
  rows: (ProgressInput & { course_id: string })[]
): Map<string, CourseProgress> {
  const byCourse = new Map<string, ProgressInput[]>();
  for (const r of rows) {
    const list = byCourse.get(r.course_id);
    if (list) list.push(r);
    else byCourse.set(r.course_id, [r]);
  }
  const out = new Map<string, CourseProgress>();
  for (const [courseId, list] of byCourse) {
    const current = courseProgress(list);
    if (current == null) continue;
    out.set(courseId, { current, projected: projectedProgress(list) ?? current });
  }
  return out;
}
