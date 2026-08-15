import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/services/academics.service";
import { ConnectGoogleBanner } from "@/components/dashboard/ConnectGoogleBanner";
import { GoogleOAuthStatus } from "@/components/dashboard/GoogleOAuthStatus";
import { TodayOverview } from "@/components/dashboard/TodayOverview";
import { CourseSnapshot } from "@/components/dashboard/CourseSnapshot";
import { AnnouncementsFeed } from "@/components/dashboard/AnnouncementsFeed";
import { GpaProjectionCard } from "@/components/dashboard/GpaProjectionCard";
import { SyncNowCard } from "@/components/dashboard/SyncNowCard";

export const metadata: Metadata = { title: "Dashboard — StudentHub" };

/**
 * Server-rendered academic dashboard. Reads entirely from the Supabase cache
 * (see services/academics.service.ts) — never calling Google per page load —
 * so this stays fast and works even if the Google connection is flaky.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Middleware normally blocks this; kept as a graceful fallback.
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getDashboardData(user.id);
  const displayName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <GoogleOAuthStatus />
      </Suspense>

      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">
          Welcome back, {displayName} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening with your studies today.
        </p>
      </div>

      {!data.googleLinked ? (
        <>
          <ConnectGoogleBanner />
          <CourseSnapshot courses={data.courses} gradeScale={data.gradeScale} />
        </>
      ) : (
        <>
          <SyncNowCard stale={data.stale} lastSyncedAt={data.lastSyncedAt} />
          <GpaProjectionCard gpa={data.gpa} targetGpa={data.targetGpa} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TodayOverview events={data.calendarEvents} upcoming={data.upcoming} />
            <AnnouncementsFeed announcements={data.announcements} />
          </div>

          <CourseSnapshot courses={data.courses} gradeScale={data.gradeScale} />
        </>
      )}
    </div>
  );
}