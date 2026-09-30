import { describe, expect, it } from "vitest";
import { assignmentRowsForCourse, staleCourseWorkIds } from "@/lib/google/assignmentRows";
import type { GoogleCourseWork, GoogleStudentSubmission } from "@/types/google";

function cw(id: string, over: Partial<GoogleCourseWork> = {}): GoogleCourseWork {
  return { id, courseId: "g1", title: `Work ${id}`, state: "PUBLISHED", ...over };
}

function sub(courseWorkId: string, state: string, assignedGrade?: number): GoogleStudentSubmission {
  return { id: `s-${courseWorkId}`, courseWorkId, state, assignedGrade };
}

describe("assignmentRowsForCourse", () => {
  it("maps max points, returned grade and turned-in state", () => {
    const [row] = assignmentRowsForCourse("u", "c", [cw("w1", { maxPoints: 20 })], [sub("w1", "RETURNED", 17)]);
    expect(row).toMatchObject({
      user_id: "u",
      course_id: "c",
      google_course_work_id: "w1",
      max_points: 20,
      grade: 17,
      submitted: true,
      state: "RETURNED",
    });
    expect(row).not.toHaveProperty("weight");
  });

  it("only counts TURNED_IN / RETURNED as submitted", () => {
    const rows = assignmentRowsForCourse(
      "u",
      "c",
      [cw("a"), cw("b"), cw("c"), cw("d")],
      [sub("a", "TURNED_IN"), sub("b", "CREATED"), sub("c", "RECLAIMED_BY_STUDENT")]
    );
    expect(rows.map((r) => r.submitted)).toEqual([true, false, false, false]);
    expect(rows[3]).toMatchObject({ grade: null, state: null });
  });

  it("drops non-positive max points (DB CHECK > 0)", () => {
    const rows = assignmentRowsForCourse("u", "c", [cw("a", { maxPoints: 0 }), cw("b")], []);
    expect(rows.map((r) => r.max_points)).toEqual([null, null]);
  });

  it("omits grade/submitted/state when submissions could not be fetched", () => {
    const [row] = assignmentRowsForCourse("u", "c", [cw("w1", { maxPoints: 10 })], null);
    expect(row.max_points).toBe(10);
    expect(row).not.toHaveProperty("grade");
    expect(row).not.toHaveProperty("submitted");
    expect(row).not.toHaveProperty("state");
  });
});

describe("staleCourseWorkIds", () => {
  it("returns unseen work ids, sparing failed courses and manual rows", () => {
    const existing = [
      { google_course_work_id: "kept", course_id: "c1" },
      { google_course_work_id: "gone", course_id: "c1" },
      { google_course_work_id: "failed", course_id: "c2" },
      { google_course_work_id: null, course_id: "c1" },
    ];
    expect(staleCourseWorkIds(existing, new Set(["kept"]), new Set(["c2"]))).toEqual(["gone"]);
  });
});
