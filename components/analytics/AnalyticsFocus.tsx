import { Timer, CalendarDays, CalendarRange, Clock, Flame, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AnalyticsData } from "@/services/analytics.service";

interface Props {
  data: AnalyticsData["focus"];
}

const BAR_AREA_PX = 64;

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  className: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-3 text-center ${className}`}>
      <p className="flex items-center justify-center gap-1 text-xs font-medium">
        <Icon className="h-3 w-3 shrink-0" /> {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function BarChart({ data, max, barClassName }: { data: { label: string; minutes: number }[]; max: number; barClassName: string }) {
  return (
    <div className="flex items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end justify-center" style={{ height: `${BAR_AREA_PX}px` }}>
            <div
              className={`w-full max-w-10 rounded-t transition-all ${d.minutes > 0 ? barClassName : "bg-gray-200"}`}
              style={{ height: `${max > 0 ? (d.minutes / max) * BAR_AREA_PX : 0}px`, minHeight: d.minutes > 0 ? "4px" : "2px" }}
              title={`${d.label}: ${formatMinutes(d.minutes)}`}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] font-medium text-gray-600">{formatMinutes(d.minutes)}</span>
          <span className="w-full truncate text-center text-[10px] text-gray-500">{d.label}</span>
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
        <CardDescription>
          {data.monthlySessions === 0
            ? "No focus sessions yet. Start a Pomodoro to see your trends."
            : "Your focus time today, this week and this month."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={Clock} label="Today" value={formatMinutes(data.dailyMinutes)} sub={plural(data.dailySessions, "session")} className="bg-emerald-50 text-emerald-700" />
          <StatTile icon={CalendarDays} label="This week" value={formatMinutes(data.weeklyMinutes)} sub={plural(data.weeklySessions, "session")} className="bg-sky-50 text-sky-700" />
          <StatTile icon={CalendarRange} label="This month" value={formatMinutes(data.monthlyMinutes)} sub={plural(data.monthlySessions, "session")} className="bg-purple-50 text-purple-700" />
          <StatTile icon={Flame} label="Average" value={formatMinutes(data.averageMinutes)} sub="per session" className="bg-amber-50 text-amber-700" />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Daily focus · last 7 days</p>
          <BarChart data={data.dailyTrend} max={maxDaily} barClassName="bg-emerald-600" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Weekly focus · last 4 weeks</p>
          <BarChart
            data={data.weeklyTrend.map((w) => ({ label: w.week, minutes: w.minutes }))}
            max={maxWeekly}
            barClassName="bg-sky-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}
