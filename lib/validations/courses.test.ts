import { describe, expect, it } from "vitest";
import { COURSE_COLORS, courseSchema } from "@/lib/validations/courses";

const base = { course_code: "", course_name: "Calculus", instructor: "", description: "", room: "", color: "" };
const parse = (over: Partial<typeof base> = {}) => courseSchema.safeParse({ ...base, ...over });

describe("courseSchema", () => {
  it("requires a non-blank name and trims it", () => {
    expect(parse({ course_name: "" }).success).toBe(false);
    expect(parse({ course_name: "   " }).success).toBe(false);
    const ok = parse({ course_name: "  Calculus  " });
    expect(ok.success && ok.data.course_name).toBe("Calculus");
  });

  it("accepts empty optional fields", () => {
    expect(parse().success).toBe(true);
    expect(courseSchema.safeParse({ course_name: "Only name" }).success).toBe(true);
  });

  it.each([
    ["course_code", 21],
    ["course_name", 121],
    ["instructor", 81],
    ["description", 501],
    ["room", 51],
    ["color", 21],
  ] as const)("rejects %s longer than its limit", (field, length) => {
    expect(parse({ [field]: "x".repeat(length) }).success).toBe(false);
    expect(parse({ [field]: "x".repeat(length - 1) }).success).toBe(true);
  });

  it("palette colors all fit the color field", () => {
    for (const color of COURSE_COLORS) expect(parse({ color }).success).toBe(true);
  });
});
