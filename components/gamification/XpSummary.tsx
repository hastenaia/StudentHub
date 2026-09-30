import { Award, Flame } from "lucide-react";
import { XP_PER_LEVEL } from "@/lib/gamification";
import type { GamificationView } from "@/types/gamification";

/** Level, XP bar, streak and earned badges (FR-02). */
export function XpSummary({ data }: { data: GamificationView }) {
  const earned = data.badges.filter((b) => b.earnedAt);
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-brand-dark">Level {data.level}</p>
        <p className="text-xs text-gray-500">{data.totalXp} XP total</p>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded bg-amber-100"
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
        aria-valuenow={data.xpIntoLevel}
      >
        <div className="h-full rounded bg-amber-500" style={{ width: `${(data.xpIntoLevel / XP_PER_LEVEL) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{data.xpToNextLevel} XP to level {data.level + 1}</p>

      <p className="mt-2 flex items-center gap-1 text-xs text-gray-600">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        {data.currentStreak}-day streak • longest {data.longestStreak}
      </p>

      {earned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {earned.map((b) => (
            <span
              key={b.slug}
              title={b.description}
              className="inline-flex items-center gap-1 rounded border border-amber-200 bg-white px-1.5 py-0.5 text-xs text-amber-800"
            >
              <Award className="h-3 w-3" /> {b.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
