import type { Metadata } from "next";
import { BookOpen, CalendarClock, GraduationCap, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — StudentHub" };

const STATS = [
  { label: "Enrolled Courses", value: "6", icon: BookOpen, accent: "text-brand-royal" },
  { label: "Current GPA", value: "3.7", icon: GraduationCap, accent: "text-brand-royal" },
  { label: "Upcoming Classes", value: "3 today", icon: CalendarClock, accent: "text-brand-royal" },
  { label: "Attendance", value: "96%", icon: TrendingUp, accent: "text-brand-royal" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">
          Welcome back, {displayName} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening with your studies today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.accent}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-brand-dark">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { time: "09:00 AM", course: "Data Structures & Algorithms", room: "Room 204" },
              { time: "11:30 AM", course: "Linear Algebra", room: "Room 118" },
              { time: "02:00 PM", course: "Technical Writing", room: "Online" },
            ].map((item) => (
              <div
                key={item.time}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-brand-gray/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-brand-dark">{item.course}</p>
                  <p className="text-xs text-gray-500">{item.room}</p>
                </div>
                <span className="text-xs font-semibold text-brand-royal">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-brand-dark">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
