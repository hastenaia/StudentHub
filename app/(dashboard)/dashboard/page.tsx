import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProductivityDashboardData } from "@/services/dashboard.service";
import { GoogleOAuthStatus } from "@/components/dashboard/GoogleOAuthStatus";
import { ConnectGoogleBanner } from "@/components/dashboard/ConnectGoogleBanner";
import { SyncNowCard } from "@/components/dashboard/SyncNowCard";
import { AnnouncementsFeed } from "@/components/dashboard/AnnouncementsFeed";
import { TodaysSchedule } from "@/components/dashboard/TodaysSchedule";
import { PriorityTasks } from "@/components/dashboard/PriorityTasks";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FocusToday } from "@/components/dashboard/FocusToday";
import { StudyActivity } from "@/components/dashboard/StudyActivity";
import { SmartRecommendation } from "@/components/dashboard/SmartRecommendation";

export const metadata: Metadata = { title: "Dashboard — StudentHub" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getProductivityDashboardData(user.id);
  const displayName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <GoogleOAuthStatus />
      </Suspense>

      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Welcome back, {displayName} 👋</h2>
        <p className="mt-1 text-sm text-gray-500">What should you focus on today?</p>
      </div>

      {!data.googleLinked ? (
        <ConnectGoogleBanner />
      ) : (
        <SyncNowCard stale={data.stale} lastSyncedAt={data.lastSyncedAt} />
      )}

      {/* Smart recommendation — hero */}
      <SmartRecommendation recommendation={data.recommendation} />

      {/* Primary productivity grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TodaysSchedule items={data.todaySchedule} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FocusToday minutes={data.focus.minutes} sessions={data.focus.sessions} streak={data.focus.streak} />
            <StudyActivity
              completedTasks={data.activity.completedTasks}
              studySessions={data.activity.studySessions}
              notesCreated={data.activity.notesCreated}
            />
          </div>
        </div>
        <div className="space-y-4">
          <PriorityTasks tasks={data.priorityTasks} />
          <QuickActions courses={data.courses} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingDeadlines deadlines={data.upcomingDeadlines} />
        <AnnouncementsFeed announcements={data.announcements} />
      </div>
    </div>
  );
}
