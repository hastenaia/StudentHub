/**
 * Pure GPA + projection math for the Academic Dashboard.
 *
 * Everything in here is a deterministic, side-effect-free function over plain
 * data so it can be unit-tested without touching Supabase or the network.
 *
 * Model summary
 * -------------
 * - Each course carries credit hours. Manual courses carry a grade point
 *   directly (e.g. 3.7). Classroom courses are graded by aggregating their
 *   assignments: the course percentage is (earned points / total possible
 *   points), converted linearly onto the configured scale's top value.
 * - A course counts toward GPA only when it has a grade point; ungraded
 *   courses still count toward total credits but are excluded from the
 *   weighted average (standard "quality points / attempted credits" model).
 */

export interface GradeScale {
  /** Letter grade -> points. Keys like "A", "A-", "B+". */
  [letter: string]: number;
}

export interface AssignmentGradeInput {
  /** Earned points. null means not yet graded. */
  earned: number | null;
  maxPoints: number;
}

export interface GpaCourseInput {
  id: string;
  name: string;
  creditHours: number;
  source: "classroom" | "manual";
  /** Direct grade point on the scale, only for manual courses. */
  manualGrade: number | null;
  assignments: AssignmentGradeInput[];
}

export interface CourseGpaResult {
  id: string;
  name: string;
  creditHours: number;
  source: "classroom" | "manual";
  /** Computed grade point on the scale, or null when not enough data. */
  gradePoints: number | null;
  /** 0..1 fraction of total possible points earned (classroom courses). */
  progress: number | null;
}

export interface GpaSummary {
  /** Weighted GPA, or null when no course has a grade yet. */
  gpa: number | null;
  /** Credits belonging to courses that actually have a grade. */
  completedCredits: number;
  /** Credits of every non-archived course. */
  totalCredits: number;
  gradedCourseCount: number;
  courseCount: number;
  courses: CourseGpaResult[];
}

export const DEFAULT_GRADE_SCALE: GradeScale = {
  A: 4,
  "A-": 3.7,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  "C+": 2.3,
  C: 2,
  "C-": 1.7,
  "D+": 1.3,
  D: 1,
  "D-": 0.7,
  F: 0,
};

/** Highest point value in a scale (e.g. 4 or 4.33), used for pct -> points. */
export function scaleTop(scale: GradeScale): number {
  const values = Object.values(scale);
  return values.length ? Math.max(...values) : 4;
}

/** Round to a fixed number of decimals without float noise. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Convert a letter grade to points. Unknown letters return undefined so the
 * caller can decide whether to skip or error (we skip, treating the course as
 * ungraded rather than corrupting the GPA).
 */
export function letterToPoints(letter: string, scale: GradeScale): number | undefined {
  return scale[letter];
}

/**
 * Reverse lookup: closest letter for a points value. Used when editing a
 * manual course's grade — the user picks a letter, we store points, and this
 * resolves the stored points back to a letter for display.
 */
export function pointsToLetter(points: number, scale: GradeScale): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const [letter, value] of Object.entries(scale)) {
    const distance = Math.abs(value - points);
    if (distance < bestDistance) {
      best = letter;
      bestDistance = distance;
    }
  }
  return best;
}

/** Preset grade scales for the settings UI. */
export const GRADE_SCALE_PRESETS: Record<string, GradeScale> = {
  "4.0 Standard": {
    A: 4,
    "A-": 3.7,
    "B+": 3.3,
    B: 3,
    "B-": 2.7,
    "C+": 2.3,
    C: 2,
    "C-": 1.7,
    "D+": 1.3,
    D: 1,
    "D-": 0.7,
    F: 0,
  },
  "4.33 (A+)": {
    "A+": 4.33,
    A: 4,
    "A-": 3.67,
    "B+": 3.33,
    B: 3,
    "B-": 2.67,
    "C+": 2.33,
    C: 2,
    "C-": 1.67,
    "D+": 1.33,
    D: 1,
    "D-": 0.67,
    F: 0,
  },
};

/**
 * Course grade points:
 * - Manual: the stored manual grade point, if present.
 * - Classroom: pct = earned/sum(maxPoints) over ALL assignments (graded or
 *   not — ungraded ones add 0 earned but still contribute maxPoints toward
 *   the denominator so progress reflects the whole workload). Converted
 *   linearly onto the scale top, capped at the scale top.
 * Returns null (ungraded) when there are no assignments or the earned total
 * cannot be determined.
 */
export function computeCourseGradePoints(
  course: GpaCourseInput,
  scale: GradeScale
): CourseGpaResult {
  if (course.source === "manual") {
    const gradePoints = course.manualGrade;
    if (gradePoints == null) {
      return { ...course, gradePoints: null, progress: null };
    }
    return {
      ...course,
      gradePoints: clampGradePoints(gradePoints, scale),
      progress: null,
    };
  }

  const totalMax = course.assignments.reduce((sum, a) => sum + a.maxPoints, 0);
  if (totalMax <= 0) {
    // Nothing graded and no known workload -> unknown grade.
    return { ...course, gradePoints: null, progress: null };
  }

  const earned = course.assignments.reduce((sum, a) => sum + (a.earned ?? 0), 0);
  const progress = clamp(earned / totalMax, 0, 1);

  // A course is "graded" for GPA purposes as soon as a single assignment has
  // an earned score.
  const hasAnyGrade = course.assignments.some((a) => a.earned != null);
  if (!hasAnyGrade) {
    return { ...course, gradePoints: null, progress };
  }

  const top = scaleTop(scale);
  const gradePoints = clamp((progress / 1) * top, 0, top);
  return { ...course, gradePoints, progress };
}

/**
 * Weighted GPA across graded courses:
 *   GPA = Σ(creditHours * gradePoints) / Σ(creditHours of graded courses)
 * A 0-credit course cannot drag the average down/up, but it's flagged via the
 * guard so it doesn't become NaN, Infinity, or 0-by-division.
 */
export function computeGpa(courses: GpaCourseInput[], scale: GradeScale): GpaSummary {
  const results = courses.map((c) => computeCourseGradePoints(c, scale));

  let weightedSum = 0;
  let completedCredits = 0;
  let gradedCourseCount = 0;

  for (const r of results) {
    const creditHours = r.creditHours;
    if (r.gradePoints == null || creditHours <= 0) continue;

    weightedSum += r.gradePoints * creditHours;
    completedCredits += creditHours;
    gradedCourseCount += 1;
  }

  const gpa = completedCredits > 0 ? round(weightedSum / completedCredits) : null;

  return {
    gpa,
    completedCredits: round(completedCredits),
    totalCredits: round(courses.reduce((sum, c) => sum + c.creditHours, 0)),
    gradedCourseCount,
    courseCount: courses.length,
    courses: results,
  };
}

/**
 * What average (on the scale, e.g. 3.5) must be earned across the remaining
 * graded credits to reach targetGpa?
 *
 *   neededAvg = (target * totalCredits - earnedQualityPoints) / remainingCredits
 *
 * Where totalCredits = completedCredits + remainingCredits. Returns:
 *   - null when there are no remaining credits (already complete)
 *   - a value > scaleTop, meaning the target is unreachable (or requires
 *     grades above the max) — caller should flag this
 *   - a negative value, meaning any grade at all suffices
 */
export function neededAverage(
  targetGpa: number,
  currentGpa: number | null,
  completedCredits: number,
  remainingCredits: number
): number | null {
  if (remainingCredits <= 0) return null;

  const currentWeighted =
    currentGpa != null && completedCredits > 0 ? currentGpa * completedCredits : 0;

  const targetQuality = targetGpa * (completedCredits + remainingCredits);
  // Any grade at or above 0 raises the GPA when targetQuality >= currentWeighted.
  return (targetQuality - currentWeighted) / remainingCredits;
}

/**
 * Per-course projection for the "what you need on the rest" view.
 * Given an existing graded portion and the total possible points available
 * (including ungraded assignments' maxPoints), computes the percentage the
 * student must average on the remaining ungraded work to hit targetPct
 * (0-100) for the course.
 */
export function assignmentProjection(
  assignments: AssignmentGradeInput[],
  targetPct: number
): { requiredPct: number | null; remainingMax: number; earned: number; totalMax: number } {
  const totalMax = assignments.reduce((sum, a) => sum + a.maxPoints, 0);
  const earned = assignments.reduce((sum, a) => sum + (a.earned ?? 0), 0);
  const remainingMax = assignments.reduce(
    (sum, a) => sum + (a.earned == null ? a.maxPoints : 0),
    0
  );

  if (totalMax <= 0) {
    return { requiredPct: null, earned, totalMax, remainingMax };
  }
  if (remainingMax <= 0) {
    // Fully graded -> no remaining work, so there is no "needed" figure.
    return { requiredPct: null, earned, totalMax, remainingMax };
  }

  const targetPoints = (targetPct / 100) * totalMax;
  const pointsNeeded = targetPoints - earned;
  // A negative result means the target is already met (caller can display
  // 0%); anything above 100 simply means it's unreachable even with perfect
  // scores on the remaining work.
  const requiredPct = round((pointsNeeded / remainingMax) * 100);
  return { requiredPct, earned, totalMax, remainingMax };
}

export type ProjectionStatus = "no-data" | "complete" | "secured" | "unreachable" | "needs";

export interface ProjectionView {
  /** "no-data": nothing has max points; "complete": all work already graded. */
  status: ProjectionStatus;
  /** Percentage still needed on the remaining ungraded work, if meaningful. */
  requiredPct: number | null;
  remainingMax: number;
  earned: number;
  totalMax: number;
  targetPct: number;
}

/**
 * Classify an assignmentProjection result into a UI-ready status.
 * - "secured": remaining scores cannot drag the course below the target
 * - "unreachable": even perfect scores on the rest won't reach the target
 * - "needs": a specific percentage is still required on the remaining work
 */
export function buildProjection(
  assignments: AssignmentGradeInput[],
  targetPct: number
): ProjectionView {
  const p = assignmentProjection(assignments, targetPct);
  const base = { ...p, targetPct };

  if (p.totalMax <= 0) return { ...base, status: "no-data", requiredPct: null };
  if (p.requiredPct == null) return { ...base, status: "complete" };
  if (p.requiredPct <= 0) return { ...base, status: "secured" };
  if (p.requiredPct >= 100) return { ...base, status: "unreachable" };
  return { ...base, status: "needs" };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampGradePoints(value: number, scale: GradeScale): number {
  return clamp(value, 0, scaleTop(scale));
}