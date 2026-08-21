import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/focus";
import type { DailyMinutes } from "@/lib/focus";

interface WeeklyChartProps {
  daily: DailyMinutes[];
  perCourse: { courseId: string | null; minutes: number }[];
  courseNames: Map<string, string>;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Last-7-days focus minutes as a pure-CSS bar chart (no chart library), plus
 * a per-course breakdown so students see where their time actually goes.
 */
export function WeeklyChart({ daily, perCourse, courseNames }: WeeklyChartProps) {
  const max = Math.max(1, ...daily.map((d) => d.minutes));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-royal" /> Last 7 days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex h-36 items-end gap-2">
          {daily.map((d) => {
            const date = new Date(`${d.date}T12:00:00`);
            const heightPct = Math.round((d.minutes / max) * 100);
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium tabular-nums text-gray-400">
                  {d.minutes > 0 ? formatMinutes(d.minutes) : ""}
                </span>
                <div className="flex h-full w-full items-end rounded-md bg-gray-50">
                  <div
                    className="w-full rounded-md bg-brand-royal transition-all"
                    style={{ height: `${Math.max(d.minutes > 0 ? 4 : 0, heightPct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {WEEKDAY_LABELS[date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>

        {perCourse.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {perCourse.slice(0, 5).map((c) => {
              const total = perCourse[0].minutes || 1;
              const name = c.courseId ? (courseNames.get(c.courseId) ?? "Unknown course") : "No course";
              return (
                <div key={c.courseId ?? "none"} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-gray-500">{name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-royal/70"
                      style={{ width: `${Math.round((c.minutes / total) * 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {formatMinutes(c.minutes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
