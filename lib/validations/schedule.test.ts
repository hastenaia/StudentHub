import { describe, expect, it } from "vitest";
import { scheduleEventSchema } from "@/lib/validations/schedule";

const base = {
  title: "Lecture",
  description: "",
  location: "",
  eventType: "class",
  startAt: "2026-09-15T09:00",
  endAt: "2026-09-15T10:00",
  allDay: false,
  color: "",
  courseId: "",
};
const parse = (over: Record<string, unknown> = {}) => scheduleEventSchema.safeParse({ ...base, ...over });

describe("scheduleEventSchema", () => {
  it("accepts a valid event, with or without a course", () => {
    expect(parse().success).toBe(true);
    expect(parse({ courseId: null }).success).toBe(true);
    expect(parse({ courseId: "c1" }).success).toBe(true);
  });

  it("requires a title, start and end", () => {
    expect(parse({ title: "  " }).success).toBe(false);
    expect(parse({ startAt: "" }).success).toBe(false);
    expect(parse({ endAt: "" }).success).toBe(false);
  });

  it("rejects unknown event types", () => {
    expect(parse({ eventType: "party" }).success).toBe(false);
  });

  it("requires the end to be after the start, reported on endAt", () => {
    const same = parse({ endAt: base.startAt });
    expect(same.success).toBe(false);
    if (!same.success) expect(same.error.issues[0].path).toEqual(["endAt"]);
    expect(parse({ endAt: "2026-09-15T08:00" }).success).toBe(false);
  });

  it("enforces length limits", () => {
    expect(parse({ title: "x".repeat(121) }).success).toBe(false);
    expect(parse({ description: "x".repeat(501) }).success).toBe(false);
    expect(parse({ location: "x".repeat(101) }).success).toBe(false);
  });
});
