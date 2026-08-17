import { describe, expect, it } from "vitest";
import {
  assignmentProjection,
  buildProjection,
  computeCourseGradePoints,
  computeGpa,
  DEFAULT_GRADE_SCALE,
  letterToPoints,
  neededAverage,
  scaleTop,
  type GpaCourseInput,
} from "./gpa";

describe("scaleTop", () => {
  it("returns the highest scale value", () => {
    expect(scaleTop(DEFAULT_GRADE_SCALE)).toBe(4);
    expect(scaleTop({ A: 4.33, "A-": 4, B: 3 })).toBe(4.33);
  });

  it("falls back to 4 on an empty scale", () => {
    expect(scaleTop({})).toBe(4);
  });
});

describe("letterToPoints", () => {
  it("resolves known letters", () => {
    expect(letterToPoints("A", DEFAULT_GRADE_SCALE)).toBe(4);
    expect(letterToPoints("A-", DEFAULT_GRADE_SCALE)).toBe(3.7);
    expect(letterToPoints("F", DEFAULT_GRADE_SCALE)).toBe(0);
  });

  it("returns undefined for unknown letters", () => {
    expect(letterToPoints("Z", DEFAULT_GRADE_SCALE)).toBeUndefined();
    expect(letterToPoints("", DEFAULT_GRADE_SCALE)).toBeUndefined();
  });
});

describe("computeCourseGradePoints", () => {
  const manual = (over: Partial<GpaCourseInput>): GpaCourseInput => ({
    id: "m",
    name: "Manual",
    creditHours: 3,
    source: "manual",
    manualGrade: 3.7,
    assignments: [],
    ...over,
  });

  it("uses the manual grade when present", () => {
    const r = computeCourseGradePoints(manual({}), DEFAULT_GRADE_SCALE);
    expect(r.gradePoints).toBe(3.7);
    expect(r.progress).toBeNull();
  });

  it("is ungraded when a manual course has no grade", () => {
    const r = computeCourseGradePoints(manual({ manualGrade: null }), DEFAULT_GRADE_SCALE);
    expect(r.gradePoints).toBeNull();
  });

  it("caps manual grades at the scale top", () => {
    const r = computeCourseGradePoints(manual({ manualGrade: 4.5 }), DEFAULT_GRADE_SCALE);
    expect(r.gradePoints).toBe(4);
  });

  it("is ungraded when a classroom course has no assignments", () => {
    const r = computeCourseGradePoints(
      {
        id: "c",
        name: "Class",
        creditHours: 3,
        source: "classroom",
        manualGrade: null,
        assignments: [],
      },
      DEFAULT_GRADE_SCALE
    );
    expect(r.gradePoints).toBeNull();
    expect(r.progress).toBeNull();
  });

  it("computes progress and grade points from assignments", () => {
    const r = computeCourseGradePoints(
      {
        id: "c",
        name: "Class",
        creditHours: 3,
        source: "classroom",
        manualGrade: null,
        assignments: [
          { earned: 80, maxPoints: 100 },
          { earned: 60, maxPoints: 100 },
          { earned: null, maxPoints: 100 }, // not graded yet
        ],
      },
      DEFAULT_GRADE_SCALE
    );
    // 140 earned / 300 possible = 46.7% -> 1.87 on a 4.0 scale.
    expect(r.progress).toBeCloseTo(0.467, 2);
    expect(r.gradePoints).toBeCloseTo(1.87, 2);
  });

  it("counts ungraded assignments toward total but not earned for GPA", () => {
    const r = computeCourseGradePoints(
      {
        id: "c",
        name: "Class",
        creditHours: 3,
        source: "classroom",
        manualGrade: null,
        assignments: [
          { earned: null, maxPoints: 100 },
          { earned: null, maxPoints: 100 },
        ],
      },
      DEFAULT_GRADE_SCALE
    );
    expect(r.progress).toBe(0);
    expect(r.gradePoints).toBeNull();
  });
});

describe("computeGpa", () => {
  it("returns null for an empty course list", () => {
    const s = computeGpa([], DEFAULT_GRADE_SCALE);
    expect(s.gpa).toBeNull();
    expect(s.completedCredits).toBe(0);
    expect(s.gradedCourseCount).toBe(0);
  });

  it("weights by credit hours", () => {
    const s = computeGpa(
      [
        {
          id: "a",
          name: "History",
          creditHours: 3,
          source: "manual",
          manualGrade: 4,
          assignments: [],
        },
        {
          id: "b",
          name: "Chem",
          creditHours: 1,
          source: "manual",
          manualGrade: 2,
          assignments: [],
        },
      ],
      DEFAULT_GRADE_SCALE
    );
    // (3*4 + 1*2) / 4 = 3.5
    expect(s.gpa).toBe(3.5);
    expect(s.completedCredits).toBe(4);
    expect(s.totalCredits).toBe(4);
    expect(s.gradedCourseCount).toBe(2);
  });

  it("skips ungraded courses from the average but keeps their credits in total", () => {
    const s = computeGpa(
      [
        {
          id: "a",
          name: "Graded",
          creditHours: 3,
          source: "manual",
          manualGrade: 4,
          assignments: [],
        },
        {
          id: "b",
          name: "Ungraded",
          creditHours: 3,
          source: "manual",
          manualGrade: null,
          assignments: [],
        },
      ],
      DEFAULT_GRADE_SCALE
    );
    expect(s.gpa).toBe(4);
    expect(s.completedCredits).toBe(3);
    expect(s.totalCredits).toBe(6);
    expect(s.gradedCourseCount).toBe(1);
  });

  it("ignores zero-credit courses without breaking the average", () => {
    const s = computeGpa(
      [
        {
          id: "a",
          name: "GPA-ish",
          creditHours: 0,
          source: "manual",
          manualGrade: 4,
          assignments: [],
        },
      ],
      DEFAULT_GRADE_SCALE
    );
    expect(s.gpa).toBeNull();
    expect(s.completedCredits).toBe(0);
  });

  it("rolls up classroom grades from assignment points", () => {
    const s = computeGpa(
      [
        {
          id: "c",
          name: "Class",
          creditHours: 4,
          source: "classroom",
          manualGrade: null,
          assignments: [
            { earned: 90, maxPoints: 100 },
            { earned: 80, maxPoints: 100 },
          ],
        },
      ],
      DEFAULT_GRADE_SCALE
    );
    expect(s.gpa).toBeCloseTo(3.4, 1); // 85% -> 3.4
    expect(s.completedCredits).toBe(4);
  });
});

describe("neededAverage", () => {
  it("returns null when there is no remaining credit", () => {
    expect(neededAverage(3.5, 3.0, 12, 0)).toBeNull();
  });

  it("computes an attainable target", () => {
    // Currently 3.0 over 12 credits (36 quality points). 6 credits left.
    // Target 3.2: needed = (3.2*18 - 36) / 6 = 3.6
    expect(neededAverage(3.2, 3.0, 12, 6)).toBeCloseTo(3.6, 2);
  });

  it("returns a negative value when the target is already secured", () => {
    // 3.0 now over 12; only 1 more credit left, target 2.5 — already locked in.
    expect(neededAverage(2.5, 3.0, 12, 1)).toBeLessThan(0);
  });

  it("flags unreachable targets (value above the scale top)", () => {
    // 2.0 over 12; target 4.0 with 3 left.
    const needed = neededAverage(4.0, 2.0, 12, 3)!;
    expect(needed).toBeGreaterThan(4);
  });

  it("handles a null current GPA (nothing graded yet)", () => {
    // Everything ahead: needed average toward the target is simply targetGpa.
    expect(neededAverage(3.0, null, 0, 12)).toBeCloseTo(3.0, 2);
  });
});

describe("assignmentProjection", () => {
  it("gives null when nothing has a max (no workload)", () => {
    const p = assignmentProjection([], 90);
    expect(p.totalMax).toBe(0);
    expect(p.requiredPct).toBeNull();
  });

  it("computes the required pct on remaining ungraded work", () => {
    // Graded 70/100; target 90% over 200 possible -> need 110 pts across 100 remaining.
    const p = assignmentProjection(
      [
        { earned: 70, maxPoints: 100 },
        { earned: null, maxPoints: 100 },
      ],
      90
    );
    expect(p.earned).toBe(70);
    expect(p.totalMax).toBe(200);
    expect(p.remainingMax).toBe(100);
    expect(p.requiredPct).toBeCloseTo(110, 2);
  });

  it("returns null when everything is already graded", () => {
    const p = assignmentProjection([{ earned: 95, maxPoints: 100 }], 90);
    expect(p.remainingMax).toBe(0);
    expect(p.requiredPct).toBeNull();
  });

  it("reports a negative required pct when the target is already met", () => {
    const p = assignmentProjection(
      [
        { earned: 100, maxPoints: 100 },
        { earned: null, maxPoints: 100 },
      ],
      50
    );
    expect(p.requiredPct).toBe(0); // clamped negative -> 0 in round
  });
});

describe("buildProjection", () => {
  it("classifies no-workload courses as no-data", () => {
    expect(buildProjection([], 90).status).toBe("no-data");
  });

  it("classifies fully-graded courses as complete", () => {
    const v = buildProjection([{ earned: 95, maxPoints: 100 }], 90);
    expect(v.status).toBe("complete");
    expect(v.requiredPct).toBeNull();
  });

  it("classifies already-met targets as secured", () => {
    // 100/100 earned on a 100pt assignment + only 5pts remaining, target 90% —
    // a 0 on the rest still leaves 95%+, so the target is already locked in.
    const v = buildProjection(
      [
        { earned: 100, maxPoints: 100 },
        { earned: null, maxPoints: 5 },
      ],
      90
    );
    expect(v.status).toBe("secured");
  });

  it("classifies impossible targets as unreachable", () => {
    // 0/100 graded, target 90% — but remaining max is only 100.
    const v = buildProjection(
      [
        { earned: 0, maxPoints: 100 },
        { earned: null, maxPoints: 100 },
      ],
      95
    );
    expect(v.status).toBe("unreachable");
  });

  it("reports the percentage still needed", () => {
    // 70/100 earned, 100pts left, target 80% overall -> need 90 on the rest.
    const v = buildProjection(
      [
        { earned: 70, maxPoints: 100 },
        { earned: null, maxPoints: 100 },
      ],
      80
    );
    expect(v.status).toBe("needs");
    expect(v.requiredPct).toBe(90);
    expect(v.remainingMax).toBe(100);
    expect(v.targetPct).toBe(80);
  });
});
