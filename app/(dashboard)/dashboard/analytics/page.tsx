import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/services/analytics.service";
import { AnalyticsTasks } from "@/components/analytics/AnalyticsTasks";
import { AnalyticsFocus } from "@/components/analytics/AnalyticsFocus";
import { AnalyticsStudy } from "@/components/analytics/AnalyticsStudy";
import { AnalyticsProductivity } from "@/components/analytics/AnalyticsProductivity";
import { AnalyticsWellness } from "@/components/analytics/AnalyticsWellness";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";

export const metadata: Metadata = { title: "Analytics — StudentHub" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view analytics.</p>;
  }

  const data = await getAnalyticsData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Analytics</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Productivity and learning habits — calculated from your actual StudentHub data. No grades, no ranking.
        </p>
      </div>

      <AnalyticsInsights insights={data.insights} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsTasks data={data.tasks} />
        <AnalyticsFocus data={data.focus} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsStudy data={data.study} />
        <AnalyticsProductivity data={data.productivity} />
      </div>

      <AnalyticsWellness data={data.wellness} />
    </div>
  );
}
