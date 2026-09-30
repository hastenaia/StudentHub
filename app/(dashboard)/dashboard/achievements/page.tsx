import { createClient } from "@/lib/supabase/server";
import { getGamificationData } from "@/services/gamification.service";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";

export const metadata = { title: "Achievements — StudentHub" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getGamificationData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Achievements</h2>
        <p className="mt-1 text-sm text-gray-500">XP, streaks, and badges earned from your real activity.</p>
      </div>
      <BadgeGrid data={data} />
    </div>
  );
}
