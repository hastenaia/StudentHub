import { createClient } from "@/lib/supabase/server";
import { getScheduleData } from "@/services/schedule.service";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { PageHeader, PageLoadError } from "@/components/common/PageHeader";

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
    return <PageLoadError title="Schedule" description="Your personal and Google calendar events." error={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Month, week, day, and agenda views — create and manage your personal schedule. Google Calendar events appear as read-only."
      />
      <ScheduleView initialEvents={data.events} courses={data.courses} initialView={data.defaultView} />
    </div>
  );
}
