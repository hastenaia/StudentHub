"use client";
import * as React from "react";
import { Trophy, Flame, Star, BookOpen, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Badge = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: "trophy" | "flame" | "star" | "book" | "target";
};

const ICONS: Record<Badge["icon"], React.ElementType> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  book: BookOpen,
  target: Target,
};

export function BadgeGrid() {
  const [loading, setLoading] = React.useState(true);
  const [xp, setXp] = React.useState({ total: 0, level: 1, nextLevelXp: 500, streakDays: 0 });
  const [badges, setBadges] = React.useState<Badge[]>([]);

  React.useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data: tasks }, { data: sessions }, { data: notes }, { data: quizzes }] = await Promise.all([
        supabase.from("tasks").select("id, status").eq("user_id", user.id),
        supabase.from("focus_sessions").select("id, started_at").eq("user_id", user.id),
        supabase.from("notes").select("id").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("id").eq("user_id", user.id),
      ]);
      const completedTasks = (tasks ?? []).filter((t) => (t as { status: string }).status === "done").length;
      const focusCount = (sessions ?? []).length;
      const notesCount = (notes ?? []).length;
      const quizCount = (quizzes ?? []).length;

      // XP: 20 per completed task, 10 per focus session, 5 per note, 15 per quiz attempt
      const total = completedTasks * 20 + focusCount * 10 + notesCount * 5 + quizCount * 15;
      const level = Math.floor(total / 500) + 1;
      const nextLevelXp = level * 500;
      // streak: count consecutive days with focus sessions
      const dates = (sessions ?? []).map((s) => (s as { started_at: string }).started_at.slice(0, 10)).sort();
      const uniq = Array.from(new Set(dates));
      let streakDays = 0;
      const today = new Date().toISOString().slice(0, 10);
      let cursor = today;
      const set = new Set(uniq);
      // count backwards from today while days exist, else count max consecutive streak
      while (set.has(cursor)) {
        streakDays++;
        const d = new Date(cursor);
        d.setDate(d.getDate() - 1);
        cursor = d.toISOString().slice(0, 10);
      }
      if (streakDays === 0 && uniq.length > 0) {
        // fallback: longest consecutive streak
        let best = 1, cur = 1;
        const sorted = uniq.sort();
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curD = new Date(sorted[i]);
          const diff = (curD.getTime() - prev.getTime()) / 86400000;
          if (diff === 1) cur++; else { best = Math.max(best, cur); cur = 1; }
        }
        best = Math.max(best, cur);
        streakDays = best;
      }

      setXp({ total, level, nextLevelXp, streakDays });

      const computed: Badge[] = [
        { id: "b1", name: "First Focus", description: "Complete your first Pomodoro", unlocked: focusCount >= 1, icon: "target" },
        { id: "b2", name: "Streak Starter", description: "3-day study streak", unlocked: streakDays >= 3, icon: "flame" },
        { id: "b3", name: "Week Warrior", description: "7-day study streak", unlocked: streakDays >= 7, icon: "flame" },
        { id: "b4", name: "Note Taker", description: "Create 5 notes", unlocked: notesCount >= 5, icon: "book" },
        { id: "b5", name: "Quiz Master", description: "Complete 3 quizzes", unlocked: quizCount >= 3, icon: "star" },
        { id: "b6", name: "Task Crusher", description: "Complete 20 tasks", unlocked: completedTasks >= 20, icon: "trophy" },
        { id: "b7", name: "Early Bird", description: "5 focus sessions", unlocked: focusCount >= 5, icon: "star" },
        { id: "b8", name: "Scholar", description: "Reach Level 5", unlocked: level >= 5, icon: "trophy" },
        { id: "b9", name: "Consistent", description: "10 focus sessions", unlocked: focusCount >= 10, icon: "book" },
      ];
      setBadges(computed);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="py-8 text-center text-sm text-gray-500">Loading achievements…</CardContent></Card>
      </div>
    );
  }

  const pct = Math.round((xp.total / xp.nextLevelXp) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> Level {xp.level} — {xp.total} XP</CardTitle>
          <CardDescription>XP from tasks, focus sessions, notes & quizzes — badges unlock automatically.</CardDescription>
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
