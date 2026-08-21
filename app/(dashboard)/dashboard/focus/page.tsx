import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFocusPageData } from "@/services/focus.service";
import { FocusTimerCard } from "@/components/focus/FocusTimerCard";
import { StudyStatsCards } from "@/components/focus/StudyStatsCards";
import { WeeklyChart } from "@/components/focus/WeeklyChart";

export const metadata: Metadata = { title: "Focus — StudentHub" };

/**
 * Focus Timer + Study Stats. The timer is a client island; everything else
 * renders server-side from the study_sessions log.
 */
export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getFocusPageData(user.id);
  const courseNames = new Map(data.courses.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Focus</h2>
        <p className="mt-1 text-sm text-gray-500">
          Beat procrastination with pomodoro sessions and see where your study time goes.
        </p>
      </div>

      <FocusTimerCard courses={data.courses} openTasks={data.openTasks} />

      <StudyStatsCards stats={data.stats} />

      <WeeklyChart daily={data.stats.daily} perCourse={data.stats.perCourse} courseNames={courseNames} />
    </div>
  );
}
