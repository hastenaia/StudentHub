import { Clock, CheckCircle2, BookOpen, CalendarDays, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WorkloadInfo } from "@/types/wellness";

interface Props { workload: WorkloadInfo }

export function WorkloadCard({ workload }: Props) {
  const { focusMinutesToday, focusSessionsToday, completedTasksToday, studySessionsToday, upcomingDeadlinesCount, suggestion } = workload;

  const focusHours = (focusMinutesToday / 60).toFixed(focusMinutesToday % 60 === 0 ? 0 : 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-brand-royal" /> Study Workload Today
        </CardTitle>
        <CardDescription>Based on your actual StudentHub activity — not a medical assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-center">
            <p className="text-lg font-bold text-emerald-700">{focusHours}h</p>
            <p className="text-xs text-emerald-700/70">{focusMinutesToday} min focus</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <Clock className="h-3 w-3" /> {focusSessionsToday} session{focusSessionsToday !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-3 text-center">
            <p className="text-lg font-bold text-sky-700">{completedTasksToday}</p>
            <p className="text-xs text-sky-700/70">tasks done</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <CheckCircle2 className="h-3 w-3" /> today
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 px-3 py-3 text-center">
            <p className="text-lg font-bold text-purple-700">{studySessionsToday}</p>
            <p className="text-xs text-purple-700/70">study sessions</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <BookOpen className="h-3 w-3" /> scheduled
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-3 text-center">
            <p className="text-lg font-bold text-amber-700">{upcomingDeadlinesCount}</p>
            <p className="text-xs text-amber-700/70">deadlines</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <CalendarDays className="h-3 w-3" /> next 7 days
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
            <Lightbulb className="h-4 w-4 text-sky-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sky-900">Gentle suggestion</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{suggestion}</p>
            <p className="mt-2 text-[11px] text-gray-400">
              This is general study habit info, not medical advice. If you need support, reach out to someone you trust or a campus resource.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
