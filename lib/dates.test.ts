import { describe, expect, it } from "vitest";
import { computeStreak, endOfDay, startOfDay, toDateStr } from "./dates";

describe("dates", () => {
  it("startOfDay / endOfDay bound the local day", () => {
    const d = new Date(2026, 8, 15, 13, 45);
    expect(startOfDay(d).getHours()).toBe(0);
    expect(endOfDay(d).getHours()).toBe(23);
    expect(endOfDay(d).getMilliseconds()).toBe(999);
    expect(startOfDay(d).getDate()).toBe(15);
  });

  it("toDateStr is the UTC calendar date", () => {
    expect(toDateStr(new Date("2026-09-15T23:30:00Z"))).toBe("2026-09-15");
  });

  describe("computeStreak", () => {
    const today = new Date("2026-09-15T12:00:00Z");
    it("counts consecutive days ending today", () => {
      expect(computeStreak(["2026-09-15T08:00:00Z", "2026-09-14T08:00:00Z", "2026-09-13T20:00:00Z"], today)).toBe(3);
    });
    it("stops at the first gap and ignores duplicates", () => {
      expect(computeStreak(["2026-09-15T08:00:00Z", "2026-09-15T09:00:00Z", "2026-09-13T08:00:00Z"], today)).toBe(1);
    });
    it("is 0 without activity today or at all", () => {
      expect(computeStreak(["2026-09-14T08:00:00Z"], today)).toBe(0);
      expect(computeStreak([], today)).toBe(0);
    });
  });
});
