import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFocusStats } from "@/services/focus.service";
import { PomodoroTimer } from "@/components/focus/PomodoroTimer";
import { FocusStats } from "@/components/focus/FocusStats";
import { ChillHub } from "@/components/focus/ChillHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ListTodo } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Focus — StudentHub" };

interface FocusPageProps {
  searchParams?: Promise<{ taskId?: string }>;
}

export default async function FocusPage({ searchParams }: FocusPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const params = await searchParams;
  const taskIdParam = params?.taskId;

  const [stats, tasksRes, coursesRes, recentRes] = await Promise.all([
    getFocusStats(user.id),
    supabase.from("tasks").select("id, title, description, status, priority, due_at, course_id, created_at").eq("user_id", user.id).neq("status", "done").order("created_at", { ascending: false }).limit(20),
    supabase.from("courses").select("id, name, course_name, color").eq("user_id", user.id).eq("archived", false).order("name"),
    supabase.from("focus_sessions").select("id, duration_minutes, started_at, ended_at, task_id, course_id").eq("user_id", user.id).order("started_at", { ascending: false }).limit(10),
  ]);

  const tasks = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as "todo" | "in_progress" | "done",
    priority: t.priority as "urgent" | "high" | "medium" | "low",
    dueAt: t.due_at,
    estimateMinutes: null,
    tags: [] as string[],
    courseId: t.course_id,
    courseName: null as string | null,
    courseColor: null as string | null,
    sortOrder: 0,
    completedAt: null as string | null,
    createdAt: t.created_at,
    recurrenceFreq: null,
    recurrenceInterval: 1,
    recurUntil: null,
  }));

  // Enrich tasks with course names
  const courses = (coursesRes.data ?? []).map((c: { id: string; name: string; course_name: string | null; color: string | null }) => ({
    id: c.id,
    name: c.course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c.name]));
  const enrichedTasks = tasks.map((t) => ({
    ...t,
    courseName: t.courseId ? courseMap.get(t.courseId) ?? null : null,
    courseColor: t.courseId ? courses.find((c) => c.id === t.courseId)?.color ?? null : null,
  }));

  const selectedTask = taskIdParam ? enrichedTasks.find((t) => t.id === taskIdParam) ?? null : null;

  const recentSessions = recentRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Focus</h2>
        <p className="mt-1 text-sm text-gray-500">Pomodoro timer • Track your deep work • Stay in flow</p>
      </div>

      <FocusStats
        todayMinutes={stats.todayMinutes}
        todaySessions={stats.todaySessions}
        weeklyMinutes={stats.weeklyMinutes}
        weeklySessions={stats.weeklySessions}
        monthlyMinutes={stats.monthlyMinutes}
        monthlySessions={stats.monthlySessions}
        streak={stats.streak}
        totalMinutes={stats.totalMinutes}
        totalSessions={stats.totalSessions}
      />

      <PomodoroTimer initialTask={selectedTask} tasks={enrichedTasks} />

      <ChillHub />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-brand-royal" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No focus sessions yet. Complete a Pomodoro to see it here.</p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((s: { id: string; duration_minutes: number; started_at: string; ended_at: string | null; task_id: string | null; course_id: string | null }) => {
                const task = s.task_id ? enrichedTasks.find((t) => t.id === s.task_id) : null;
                const courseName = s.course_id ? courseMap.get(s.course_id) : null;
                return (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-brand-gray/30 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-dark">
                        {task ? task.title : "Focus session"} • {s.duration_minutes} min
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {new Date(s.started_at).toLocaleDateString()} {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {courseName ?? task?.courseName ?? "No course"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {s.duration_minutes} min
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4 text-brand-royal" /> Start Focus from a Task
            </CardTitle>
            <p className="text-xs text-gray-500">Pick a task to associate with your next session</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {tasks.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/focus?taskId=${t.id}`}
                  className={`flex items-center justify-between rounded-md border p-3 text-left hover:bg-brand-gray/20 ${selectedTask?.id === t.id ? "border-brand-royal bg-brand-royal/[0.03]" : "border-gray-200 bg-white"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-dark">{t.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {t.courseName ?? "No course"} • {t.priority}
                    </p>
                  </div>
                  <span className={buttonVariants({ variant: selectedTask?.id === t.id ? "default" : "outline", size: "sm" })}>
                    Focus
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
