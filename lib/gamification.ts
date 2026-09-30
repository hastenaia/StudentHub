import type { AwardResult, BadgeView, GamificationView } from "@/types/gamification";

/**
 * Pure gamification helpers. XP amounts, streak ticks and badge unlocks are
 * decided server-side by the award RPCs (migration 20260930000002); this module
 * only parses their results and shapes profile rows for display.
 */

export const XP_PER_LEVEL = 100;

/** Level 1 covers 0–99 XP, level 2 covers 100–199, and so on. */
export function levelProgress(totalXp: number): { level: number; xpIntoLevel: number; xpToNextLevel: number } {
  const xp = Math.max(0, Math.floor(totalXp));
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { level: Math.floor(xp / XP_PER_LEVEL) + 1, xpIntoLevel, xpToNextLevel: XP_PER_LEVEL - xpIntoLevel };
}

/** The user's calendar date (YYYY-MM-DD) in their profile timezone; UTC if the zone is invalid. */
export function localDateStr(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "UTC" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function previousDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** The stored streak only ticks on activity, so it is shown as 0 once a whole day was missed. */
export function displayStreak(currentStreak: number, lastActiveDate: string | null, today: string): number {
  if (!lastActiveDate) return 0;
  return lastActiveDate === today || lastActiveDate === previousDay(today) ? currentStreak : 0;
}

interface ProfileCounters {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export function toGamificationView(
  profile: ProfileCounters,
  badges: { id: string; slug: string; name: string; description: string; xp_threshold: number }[],
  earned: { badge_id: string; awarded_at: string }[],
  today: string
): GamificationView {
  const earnedAt = new Map(earned.map((e) => [e.badge_id, e.awarded_at]));
  const badgeViews: BadgeView[] = badges.map((b) => ({
    slug: b.slug,
    name: b.name,
    description: b.description,
    xpThreshold: b.xp_threshold,
    earnedAt: earnedAt.get(b.id) ?? null,
  }));
  return {
    totalXp: profile.total_xp,
    ...levelProgress(profile.total_xp),
    currentStreak: displayStreak(profile.current_streak, profile.last_active_date, today),
    longestStreak: profile.longest_streak,
    badges: badgeViews,
  };
}

/** Validates an award RPC's jsonb payload; null when it is missing or malformed. */
export function parseAwardResult(data: unknown): AwardResult | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  if (typeof r.xp !== "number" || typeof r.total_xp !== "number" || typeof r.streak !== "number") return null;
  return {
    awarded: r.awarded === true,
    xp: r.xp,
    totalXp: r.total_xp,
    streak: r.streak,
    newBadges: Array.isArray(r.new_badges) ? r.new_badges.filter((b): b is string => typeof b === "string") : [],
  };
}

/** Toast suffix such as "+10 XP · 3-day streak · Badge: First Task"; null when nothing new was earned. */
export function formatXpToast(result: AwardResult | null | undefined): string | null {
  if (!result?.awarded || (result.xp <= 0 && result.newBadges.length === 0)) return null;
  const parts = [`+${result.xp} XP`];
  if (result.streak >= 2) parts.push(`${result.streak}-day streak`);
  if (result.newBadges.length > 0) parts.push(`Badge: ${result.newBadges.join(", ")}`);
  return parts.join(" · ");
}

/** A mutation's message followed by its XP award, when there is one. */
export function withXpToast(message: string | undefined, result: AwardResult | null | undefined): string {
  return [message, formatXpToast(result)].filter(Boolean).join(" · ");
}
