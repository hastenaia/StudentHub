import { describe, expect, it } from "vitest";
import {
  displayStreak,
  formatXpToast,
  levelProgress,
  localDateStr,
  parseAwardResult,
  toGamificationView,
} from "@/lib/gamification";
import type { AwardResult } from "@/types/gamification";

describe("levelProgress", () => {
  it("uses 100 XP per level starting at level 1", () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNextLevel: 100 });
    expect(levelProgress(99)).toEqual({ level: 1, xpIntoLevel: 99, xpToNextLevel: 1 });
    expect(levelProgress(100)).toEqual({ level: 2, xpIntoLevel: 0, xpToNextLevel: 100 });
    expect(levelProgress(250)).toEqual({ level: 3, xpIntoLevel: 50, xpToNextLevel: 50 });
  });

  it("treats negative or fractional XP safely", () => {
    expect(levelProgress(-5).level).toBe(1);
    expect(levelProgress(150.9)).toEqual({ level: 2, xpIntoLevel: 50, xpToNextLevel: 50 });
  });
});

describe("localDateStr", () => {
  const now = new Date("2026-09-30T20:00:00Z");

  it("formats the date in the given timezone", () => {
    expect(localDateStr("UTC", now)).toBe("2026-09-30");
    expect(localDateStr("Asia/Manila", now)).toBe("2026-10-01");
  });

  it("falls back to UTC for a missing or invalid zone", () => {
    expect(localDateStr(null, now)).toBe("2026-09-30");
    expect(localDateStr("Not/AZone", now)).toBe("2026-09-30");
  });
});

describe("displayStreak", () => {
  it("keeps the streak when last active today or yesterday", () => {
    expect(displayStreak(4, "2026-09-30", "2026-09-30")).toBe(4);
    expect(displayStreak(4, "2026-09-29", "2026-09-30")).toBe(4);
  });

  it("shows 0 once a whole day was missed or with no activity", () => {
    expect(displayStreak(4, "2026-09-28", "2026-09-30")).toBe(0);
    expect(displayStreak(4, null, "2026-09-30")).toBe(0);
  });

  it("handles month boundaries", () => {
    expect(displayStreak(2, "2026-09-30", "2026-10-01")).toBe(2);
  });
});

describe("toGamificationView", () => {
  it("combines counters, level and earned badges", () => {
    const view = toGamificationView(
      { total_xp: 120, current_streak: 3, longest_streak: 5, last_active_date: "2026-09-30" },
      [
        { id: "b1", slug: "first-task", name: "First Task", description: "d", xp_threshold: 0 },
        { id: "b2", slug: "xp-500", name: "Dedicated", description: "d", xp_threshold: 500 },
      ],
      [{ badge_id: "b1", awarded_at: "2026-09-29T10:00:00Z" }],
      "2026-09-30"
    );
    expect(view).toMatchObject({ totalXp: 120, level: 2, xpIntoLevel: 20, currentStreak: 3, longestStreak: 5 });
    expect(view.badges.map((b) => [b.slug, b.earnedAt])).toEqual([
      ["first-task", "2026-09-29T10:00:00Z"],
      ["xp-500", null],
    ]);
  });
});

describe("parseAwardResult", () => {
  it("maps the RPC payload", () => {
    expect(parseAwardResult({ awarded: true, xp: 10, total_xp: 110, streak: 2, new_badges: ["Rising Scholar", 3] })).toEqual({
      awarded: true,
      xp: 10,
      totalXp: 110,
      streak: 2,
      newBadges: ["Rising Scholar"],
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseAwardResult(null)).toBeNull();
    expect(parseAwardResult({ xp: "10", total_xp: 1, streak: 1 })).toBeNull();
  });
});

describe("formatXpToast", () => {
  const base: AwardResult = { awarded: true, xp: 10, totalXp: 10, streak: 1, newBadges: [] };

  it("summarises XP, streak and badges", () => {
    expect(formatXpToast(base)).toBe("+10 XP");
    expect(formatXpToast({ ...base, streak: 3, newBadges: ["First Task"] })).toBe("+10 XP · 3-day streak · Badge: First Task");
  });

  it("returns null for replays, zero-point awards and missing results", () => {
    expect(formatXpToast({ ...base, awarded: false })).toBeNull();
    expect(formatXpToast({ ...base, xp: 0 })).toBeNull();
    expect(formatXpToast(null)).toBeNull();
  });
});
