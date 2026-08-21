import { createClient } from "@/lib/supabase/server";
import { getScheduleData } from "@/services/schedule.service";
import { ScheduleView } from "@/components/schedule/ScheduleView";

export const metadata = { title: "Schedule — StudentHub" };

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  let data;
  let error: string | null = null;
  try {
    data = await getScheduleData(user.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load schedule.";
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Schedule</h2>
          <p className="mt-1 text-sm text-gray-500">Your personal and Google calendar events.</p>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Schedule</h2>
        <p className="mt-1 text-sm text-gray-500">
          Month, week, day, and agenda views — create and manage your personal schedule. Google Calendar events appear as read-only.
        </p>
      </div>
      <ScheduleView initialEvents={data.events} courses={data.courses} />
    </div>
  );
}
