import { TrendingUp, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
  data: {
    mostProductiveDay: string | null;
    mostProductiveMinutes: number;
    taskTrend: { date: string; label: string; count: number }[];
    averageFocusSession: number;
  };
}

export function AnalyticsProductivity({ data }: Props) {
  const max = Math.max(1, ...data.taskTrend.map((t) => t.count));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-brand-royal" /> Productivity
        </CardTitle>
        <CardDescription>Most productive days, completion trends and averages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-brand-gray/60 px-3 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-gray-600">
              <CalendarDays className="h-3 w-3" /> Most productive day
            </p>
            <p className="mt-1 text-sm font-bold text-brand-dark">{data.mostProductiveDay ?? "—"}</p>
            <p className="text-xs text-gray-500">{data.mostProductiveMinutes} focus minutes</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Clock className="h-3 w-3" /> Average focus session
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-700">{data.averageFocusSession} min</p>
            <p className="text-xs text-gray-500">per session</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Task completion trend (last 7 days)</p>
          <div className="flex h-20 items-end gap-1">
            {data.taskTrend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full justify-center" style={{ height: "64px" }}>
                  <div
                    className="w-full max-w-10 rounded-t bg-brand-royal transition-all"
                    style={{ height: `${(d.count / max) * 64}px`, minHeight: d.count > 0 ? "4px" : "2px", opacity: d.count > 0 ? 1 : 0.2 }}
                    title={`${d.label}: ${d.count}`}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{d.label}</span>
                <span className="text-[10px] font-medium text-gray-600">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
