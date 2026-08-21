import { Timer, CalendarDays, Clock, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
  data: {
    dailyMinutes: number;
    dailySessions: number;
    weeklyMinutes: number;
    weeklySessions: number;
    monthlyMinutes: number;
    monthlySessions: number;
    averageMinutes: number;
    dailyTrend: { date: string; label: string; minutes: number }[];
    weeklyTrend: { week: string; minutes: number }[];
  };
}

function BarChart({ data, max, color }: { data: { label: string; minutes: number }[]; max: number; color: string }) {
  return (
    <div className="flex h-20 items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full justify-center" style={{ height: "64px" }}>
            <div
              className="w-full max-w-10 rounded-t transition-all"
              style={{ height: `${max > 0 ? (d.minutes / max) * 64 : 0}px`, backgroundColor: color, minHeight: d.minutes > 0 ? "4px" : "2px" }}
              title={`${d.label}: ${d.minutes} min`}
            />
          </div>
          <span className="text-[10px] text-gray-500">{d.label}</span>
          <span className="text-[10px] font-medium text-gray-600">{d.minutes}m</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsFocus({ data }: Props) {
  const maxDaily = Math.max(1, ...data.dailyTrend.map((d) => d.minutes));
  const maxWeekly = Math.max(1, ...data.weeklyTrend.map((d) => d.minutes));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-emerald-600" /> Focus
        </CardTitle>
        <CardDescription>Daily, weekly, monthly and averages from focus_sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-700">
              <Clock className="h-3 w-3" /> Today
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{data.dailyMinutes}m</p>
            <p className="text-xs text-gray-500">{data.dailySessions} sessions</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-sky-700">
              <CalendarDays className="h-3 w-3" /> Week
            </p>
            <p className="mt-1 text-xl font-bold text-sky-700">{data.weeklyMinutes}m</p>
            <p className="text-xs text-gray-500">{data.weeklySessions} sessions</p>
          </div>
          <div className="rounded-lg bg-purple-50 px-3 py-3 text-center">
            <p className="text-xs font-medium text-purple-700">Month</p>
            <p className="mt-1 text-xl font-bold text-purple-700">{data.monthlyMinutes}m</p>
            <p className="text-xs text-gray-500">{data.monthlySessions} sessions</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-amber-700">
              <Flame className="h-3 w-3" /> Avg
            </p>
            <p className="mt-1 text-xl font-bold text-amber-700">{data.averageMinutes}m</p>
            <p className="text-xs text-gray-500">per session</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Daily focus (last 7 days)</p>
          <BarChart data={data.dailyTrend} max={maxDaily} color="#059669" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Weekly focus (last 4 weeks)</p>
          <BarChart
            data={data.weeklyTrend.map((w) => ({ label: w.week, minutes: w.minutes }))}
            max={maxWeekly}
            color="#0284c7"
          />
        </div>
      </CardContent>
    </Card>
  );
}
