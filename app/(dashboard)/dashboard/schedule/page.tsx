import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDeadlineRadarData } from "@/services/planner.service";
import { DeadlineRadarView } from "@/components/schedule/DeadlineRadar";

export const metadata: Metadata = { title: "Schedule — StudentHub" };

/**
 * Deadline Radar: a 28-day heatmap of upcoming unsubmitted work with
 * crunch-week warnings, built entirely from the Supabase cache.
 */
export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const radar = await getDeadlineRadarData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Schedule</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spot deadline pile-ups weeks before they hit — never get blindsided again.
        </p>
      </div>
      <DeadlineRadarView radar={radar} />
    </div>
  );
}
