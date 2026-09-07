import { BadgeGrid } from "@/components/gamification/BadgeGrid";
export const metadata = { title: "Achievements — StudentHub" };
export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Achievements</h2>
        <p className="mt-1 text-sm text-gray-500">Gamification — XP, streaks, and badges (FR-14 mock).</p>
      </div>
      <BadgeGrid />
    </div>
  );
}
