import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, Plug, ShieldCheck, UserCircle, Palette, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getGoogleAccountView } from "@/services/academics.service";
import { GoogleConnectionCard } from "@/components/settings/GoogleConnectionCard";
import { ManualCoursesCard } from "@/components/settings/ManualCoursesCard";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { PreferencesCard } from "@/components/settings/PreferencesCard";
import { AccountCard } from "@/components/settings/AccountCard";
import type { DashboardCourse } from "@/types/academics";

export const metadata: Metadata = { title: "Settings — StudentHub" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName = user?.user_metadata?.full_name ?? "Student";

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const [account, profileRes, manualCoursesRes] = await Promise.all([
    getGoogleAccountView(user.id),
    supabase
      .from("profiles")
      .select("timezone, theme, default_calendar_view, default_task_view, notifications_enabled, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", "manual")
      .order("created_at"),
  ]);

  const profile = profileRes.data;

  const manualCourseViews: DashboardCourse[] = (manualCoursesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    room: c.room,
    teacherName: c.teacher_name,
    color: c.color,
    source: "manual",
    creditHours: Number(c.credit_hours ?? 0),
    upcomingAssignments: [],
  }));

  const timezone = (profile as { timezone?: string } | null)?.timezone ?? "UTC";
  const theme = ((profile as { theme?: string } | null)?.theme as "light" | "dark" | "system") ?? "system";
  const defaultCalendarView = ((profile as { default_calendar_view?: string } | null)?.default_calendar_view as "month" | "week" | "day" | "agenda") ?? "month";
  const defaultTaskView = ((profile as { default_task_view?: string } | null)?.default_task_view as "kanban" | "list") ?? "kanban";
  const notificationsEnabled = (profile as { notifications_enabled?: boolean } | null)?.notifications_enabled ?? true;

  // Prefer profile full_name if exists, else metadata
  const displayName = ((profile as { full_name?: string | null } | null)?.full_name ?? fullName) as string;
  const avatarUrl = ((profile as { avatar_url?: string | null } | null)?.avatar_url ?? (user.user_metadata?.avatar_url as string | null) ?? null) as string | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark">Account settings</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your profile, Google, and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-brand-royal" /> Profile
          </CardTitle>
          <CardDescription>Name, email, avatar and timezone.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileCard initialName={displayName} email={user.email ?? null} avatarUrl={avatarUrl} initialTimezone={timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-brand-royal" /> Google
          </CardTitle>
          <CardDescription>
            Connect read-only access to your Google Calendar and Classroom to power the dashboard. Grades are never synced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleConnectionCard account={account} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-brand-royal" /> Preferences
          </CardTitle>
          <CardDescription>Theme, default views and notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesCard
            initialTheme={theme}
            initialCalendarView={defaultCalendarView}
            initialTaskView={defaultTaskView}
            initialNotifications={notificationsEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-royal" /> Manual courses
          </CardTitle>
          <CardDescription>Add courses that aren&apos;t on Google Classroom.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManualCoursesCard courses={manualCourseViews} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-royal" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-dark">Password</p>
            <p className="text-sm text-gray-500">Last changed: unavailable</p>
          </div>
          <Link href="/change-password" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <KeyRound className="h-4 w-4" /> Change password
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-brand-royal" /> Account
          </CardTitle>
          <CardDescription>Sign out or permanently delete your account and data.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountCard />
        </CardContent>
      </Card>
    </div>
  );
}
