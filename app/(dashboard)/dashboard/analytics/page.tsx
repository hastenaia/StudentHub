import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAnalyticsTab } from "@/lib/analyticsSummary";
import { getAnalyticsData } from "@/services/analytics.service";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export const metadata: Metadata = { title: "Analytics — StudentHub" };

interface AnalyticsPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view analytics.</p>;
  }

  const params = await searchParams;
  const initialTab = isAnalyticsTab(params?.tab) ? params.tab : "overview";

  const data = await getAnalyticsData(user.id);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Analytics</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Productivity and learning habits — calculated from your actual StudentHub data. No grades, no ranking.
        </p>
      </div>

      <AnalyticsView data={data} initialTab={initialTab} />
    </div>
  );
}
