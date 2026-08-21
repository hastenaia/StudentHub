import { describe, expect, it } from "vitest";
import { manualCourseSchema } from "./academics";

describe("manualCourseSchema", () => {
  it("accepts a minimal valid course", () => {
    const parsed = manualCourseSchema.safeParse({ name: "Chemistry", creditHours: "4" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty names and non-positive credits", () => {
    expect(manualCourseSchema.safeParse({ name: "  ", creditHours: "4" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "0" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "-2" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "abc" }).success).toBe(false);
  });
});