import { describe, expect, it } from "vitest";
import { wellnessEntrySchema } from "@/lib/validations/wellness";

describe("wellnessEntrySchema", () => {
  it("accepts moods 1–5 with an optional journal", () => {
    for (const mood of [1, 3, 5]) expect(wellnessEntrySchema.safeParse({ mood }).success).toBe(true);
    expect(wellnessEntrySchema.safeParse({ mood: 4, journal: "" }).success).toBe(true);
    expect(wellnessEntrySchema.safeParse({ mood: 4, journal: "Good day" }).success).toBe(true);
  });

  it("rejects moods outside 1–5", () => {
    expect(wellnessEntrySchema.safeParse({ mood: 0 }).success).toBe(false);
    expect(wellnessEntrySchema.safeParse({ mood: 6 }).success).toBe(false);
    expect(wellnessEntrySchema.safeParse({}).success).toBe(false);
  });

  it("caps the journal at 2000 characters", () => {
    expect(wellnessEntrySchema.safeParse({ mood: 3, journal: "x".repeat(2000) }).success).toBe(true);
    expect(wellnessEntrySchema.safeParse({ mood: 3, journal: "x".repeat(2001) }).success).toBe(false);
  });
});
