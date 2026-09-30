import { Trophy, Flame, Star, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { XpSummary } from "@/components/gamification/XpSummary";
import type { BadgeView, GamificationView } from "@/types/gamification";

const ICON_BY_SLUG: Record<string, React.ElementType> = {
  "first-task": Target,
  "focus-25": Star,
  "streak-7": Flame,
};

function badgeIcon(b: BadgeView): React.ElementType {
  return ICON_BY_SLUG[b.slug] ?? (b.xpThreshold > 0 ? Trophy : Award);
}

/** Achievements page body: stored XP/level/streak and the badge catalogue (earned vs locked). */
export function BadgeGrid({ data }: { data: GamificationView }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Level {data.level} — {data.totalXp} XP
          </CardTitle>
          <CardDescription>Earn XP by completing tasks, finishing focus sessions and journaling.</CardDescription>
        </CardHeader>
        <CardContent>
          <XpSummary data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-royal" /> Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.badges.map((b) => {
              const Icon = badgeIcon(b);
              const unlocked = b.earnedAt !== null;
              return (
                <div
                  key={b.slug}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center ${unlocked ? "border-gray-200 bg-white" : "border-gray-100 bg-brand-gray/40 opacity-60 grayscale"}`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${unlocked ? "bg-brand-royal text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-brand-dark">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                  <p className="text-[11px] font-medium text-gray-400">{unlocked ? "Unlocked" : "Locked"}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
