import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getWellnessData } from "@/services/wellness.service";
import { WellnessView } from "@/components/wellness/WellnessView";

export const metadata: Metadata = { title: "Wellness — StudentHub" };

export default async function WellnessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getWellnessData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Wellness</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Healthy study habits start with reflection. Track your mood and journal privately — this is for your own awareness, not a medical diagnosis.
        </p>
      </div>

      <WellnessView
        initialToday={data.todayEntry}
        initialHistory={data.history}
        initialWeekly={data.weeklyMood}
        initialWorkload={data.workload}
      />
    </div>
  );
}
