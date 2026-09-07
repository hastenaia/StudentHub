"use client";
import * as React from "react";
import { Trophy, Flame, Star, BookOpen, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockBadges, mockXp, type Badge } from "@/lib/mocks/gamification";
import { useToast } from "@/hooks/useToast";

const ICONS: Record<Badge["icon"], React.ElementType> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  book: BookOpen,
  target: Target,
};

export function BadgeGrid() {
  const { toast } = useToast();
  const [xp, setXp] = React.useState(mockXp);
  const [badges, setBadges] = React.useState(mockBadges);
  const pct = Math.round((xp.total / xp.nextLevelXp) * 100);

  const earn = () => {
    const next = Math.min(xp.nextLevelXp, xp.total + 50);
    const leveled = next >= xp.nextLevelXp;
    setXp({ ...xp, total: next, level: leveled ? xp.level + 1 : xp.level, streakDays: xp.streakDays + 1 });
    if (leveled) {
      toast({ title: "Level up! 🎉", description: `Reached Level ${xp.level + 1}`, variant: "success" });
    } else {
      toast({ title: "+50 XP (mock)", description: "Keep going!", variant: "success" });
    }
    // randomly unlock one
    const locked = badges.find((b) => !b.unlocked);
    if (locked && Math.random() > 0.5) {
      setBadges((prev) => prev.map((b) => b.id === locked.id ? { ...b, unlocked: true } : b));
      toast({ title: `Badge unlocked: ${locked.name}`, variant: "success" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> Level {xp.level} — {xp.total} XP</CardTitle>
          <CardDescription>XP & streaks on task & focus completion; badges unlock automatically (FR-14 mock).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500"><span>{xp.total} XP</span><span>{xp.nextLevelXp} XP → Level {xp.level + 1}</span></div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-3 rounded-full bg-brand-royal transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400">{xp.nextLevelXp - xp.total} XP to next level</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700"><Flame className="h-4 w-4" /> {xp.streakDays}-day streak</span>
            <Button size="sm" onClick={earn}>Complete mock task +50 XP</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-brand-royal" /> Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {badges.map((b) => {
              const Icon = ICONS[b.icon] ?? Star;
              return (
                <div key={b.id} className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center ${b.unlocked ? "border-gray-200 bg-white" : "border-gray-100 bg-brand-gray/40 opacity-60 grayscale"}`}>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${b.unlocked ? "bg-brand-royal text-white" : "bg-gray-200 text-gray-400"}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-brand-dark">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.unlocked ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{b.unlocked ? "Unlocked" : "Locked"}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
