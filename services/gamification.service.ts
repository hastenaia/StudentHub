import { createClient } from "@/lib/supabase/server";
import { localDateStr, toGamificationView } from "@/lib/gamification";
import type { GamificationView } from "@/types/gamification";

/**
 * Server-side read of the user's XP, level, streak and badges. XP is only
 * written by the award RPCs; this never recomputes it from activity.
 */
export async function getGamificationData(userId: string): Promise<GamificationView> {
  const supabase = await createClient();
  const [profileRes, badgesRes, earnedRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("total_xp, current_streak, longest_streak, last_active_date, timezone")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("badges").select("id, slug, name, description, xp_threshold").order("xp_threshold").order("slug"),
    supabase.from("user_badges").select("badge_id, awarded_at").eq("user_id", userId),
  ]);

  const profile = profileRes.data ?? { total_xp: 0, current_streak: 0, longest_streak: 0, last_active_date: null, timezone: "UTC" };
  return toGamificationView(profile, badgesRes.data ?? [], earnedRes.data ?? [], localDateStr(profile.timezone));
}
