import { describe, expect, it } from "vitest";
import { academicSettingsSchema, manualCourseSchema } from "./academics";

describe("academicSettingsSchema", () => {
  it("accepts a normal target and preset", () => {
    const parsed = academicSettingsSchema.safeParse({ targetGpa: "3.2", scalePreset: "4.0 Standard" });
    expect(parsed.success).toBe(true);
  });

  it("rejects out-of-range GPAs", () => {
    expect(academicSettingsSchema.safeParse({ targetGpa: "5", scalePreset: "4.0 Standard" }).success).toBe(false);
    expect(academicSettingsSchema.safeParse({ targetGpa: "-1", scalePreset: "4.0 Standard" }).success).toBe(false);
    expect(academicSettingsSchema.safeParse({ targetGpa: "4.33", scalePreset: "4.33 (A+)" }).success).toBe(true);
    expect(academicSettingsSchema.safeParse({ targetGpa: "abc", scalePreset: "4.33 (A+)" }).success).toBe(false);
  });
});

describe("manualCourseSchema", () => {
  it("accepts a minimal valid course", () => {
    const parsed = manualCourseSchema.safeParse({ name: "Chemistry", creditHours: "4" });
    expect(parsed.success).toBe(true);
  });

  it("accepts an optional letter grade", () => {
    const parsed = manualCourseSchema.safeParse({
      name: "Chemistry",
      creditHours: "4",
      gradeLetter: "A-",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty names and non-positive credits", () => {
    expect(manualCourseSchema.safeParse({ name: "  ", creditHours: "4" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "0" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "-2" }).success).toBe(false);
    expect(manualCourseSchema.safeParse({ name: "Chem", creditHours: "abc" }).success).toBe(false);
  });
});