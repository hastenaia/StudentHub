/** Result of an award RPC (`award_task_xp` / `award_focus_xp` / `award_journal_xp`). */
export interface AwardResult {
  /** False when this event was already rewarded (idempotent replay). */
  awarded: boolean;
  /** Points granted by this event. */
  xp: number;
  totalXp: number;
  streak: number;
  /** Display names of badges unlocked by this event. */
  newBadges: string[];
}

/** A client-service result that may also carry the XP it earned. */
export type WithXp<T> = T & { xp?: AwardResult | null };

export interface BadgeView {
  slug: string;
  name: string;
  description: string;
  /** > 0 → unlocked by total XP; 0 → unlocked by an event (first task, 25-min focus, 7-day streak). */
  xpThreshold: number;
  earnedAt: string | null;
}

export interface GamificationView {
  totalXp: number;
  level: number;
  /** XP earned inside the current level (0–99). */
  xpIntoLevel: number;
  xpToNextLevel: number;
  /** 0 when the last active day is before yesterday (the streak has lapsed). */
  currentStreak: number;
  longestStreak: number;
  badges: BadgeView[];
}
