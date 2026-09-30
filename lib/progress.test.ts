import { describe, expect, it } from "vitest";
import { courseProgress, progressByCourse, projectedProgress, type ProgressInput } from "@/lib/progress";

function a(grade: number | null, max_points: number | null, weight: number | null = 1): ProgressInput {
  return { grade, max_points, weight };
}

describe("courseProgress (0–100)", () => {
  it("returns null when nothing is graded", () => {
    expect(courseProgress([])).toBeNull();
    expect(courseProgress([a(null, 100), a(null, 50)])).toBeNull();
  });

  it("returns 100 when every graded assignment is perfect", () => {
    expect(courseProgress([a(10, 10), a(50, 50)])).toBe(100);
  });

  it("respects weights", () => {
    // 50% weighted 3 + 100% weighted 1 → (1.5 + 1) / 4 = 62.5 → 63
    expect(courseProgress([a(5, 10, 3), a(10, 10, 1)])).toBe(63);
    expect(courseProgress([a(5, 10, 1), a(10, 10, 1)])).toBe(75);
  });

  it("ignores rows without positive max_points", () => {
    expect(courseProgress([a(5, null), a(3, 0), a(8, 10)])).toBe(80);
  });

  it("clamps extra credit to 100", () => {
    expect(courseProgress([a(12, 10)])).toBe(100);
  });

  it("treats a missing or non-positive weight as 1", () => {
    expect(courseProgress([a(5, 10, null), a(10, 10, 0)])).toBe(75);
  });
});

describe("projectedProgress", () => {
  it("returns null when nothing is scorable", () => {
    expect(projectedProgress([a(null, null)])).toBeNull();
  });

  it("assumes 80% on ungraded work by default", () => {
    // 50% graded + 80% assumed → 65
    expect(projectedProgress([a(5, 10), a(null, 10)])).toBe(65);
  });

  it("is above current when current is below the assumed ratio", () => {
    const rows = [a(6, 10), a(null, 10), a(null, 10)];
    expect(projectedProgress(rows)!).toBeGreaterThan(courseProgress(rows)!);
  });

  it("accepts a custom assumed ratio", () => {
    expect(projectedProgress([a(10, 10), a(null, 10)], 0)).toBe(50);
  });
});

describe("progressByCourse", () => {
  it("groups by course and omits courses without graded work", () => {
    const map = progressByCourse([
      { course_id: "c1", ...a(9, 10) },
      { course_id: "c1", ...a(null, 10) },
      { course_id: "c2", ...a(null, 10) },
    ]);
    expect(map.get("c1")).toEqual({ current: 90, projected: 85 });
    expect(map.has("c2")).toBe(false);
  });
});
