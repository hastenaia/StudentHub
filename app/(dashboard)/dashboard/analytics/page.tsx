import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/services/analytics.service";
import { AnalyticsTasks } from "@/components/analytics/AnalyticsTasks";
import { AnalyticsFocus } from "@/components/analytics/AnalyticsFocus";
import { AnalyticsStudy } from "@/components/analytics/AnalyticsStudy";
import { AnalyticsProductivity } from "@/components/analytics/AnalyticsProductivity";
import { AnalyticsWellness } from "@/components/analytics/AnalyticsWellness";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";
import { BarChart, LineDots } from "@/components/analytics/BarChart";

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChart
          title="Focus session hours"
          description="Minutes per day — last 7 days"
          data={data.focus.dailyTrend.map((d) => ({ label: d.label, value: d.minutes }))}
          color="bg-brand-royal"
          valueLabel="m"
        />
        <BarChart
          title="Task velocity"
          description="Tasks completed per day"
          data={data.productivity.taskTrend.map((d) => ({ label: d.label, value: d.count }))}
          color="bg-emerald-500"
          valueLabel=""
        />
      </div>

      <LineDots data={data.wellness.moodTrend.map((d) => ({ label: d.label, value: d.mood ?? 0 }))} />

      {data.focus.weeklyTrend.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.focus.weeklyTrend.map((w) => (
            <div key={w.week} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{w.week}</p>
              <p className="text-lg font-semibold text-brand-dark">{w.minutes}m</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1.5 bg-brand-royal" style={{ width: `${Math.min(100, (w.minutes / 180) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
