import { AlertTriangle, CalendarClock, Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeadlineRadar, RadarDay, RadarLevel } from "@/lib/deadlineRadar";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/utils/cn";

interface DeadlineRadarViewProps {
  radar: DeadlineRadar;
}

const LEVEL_STYLES: Record<RadarLevel, string> = {
  0: "bg-gray-50 text-gray-300",
  1: "bg-emerald-100 text-emerald-700",
  2: "bg-amber-200 text-amber-900",
  3: "bg-red-500 text-white",
};

/** 28-day deadline heatmap with crunch-week warnings. Server-rendered. */
export function DeadlineRadarView({ radar }: DeadlineRadarViewProps) {
  const crunchWeeks = radar.weeks.filter((w) => w.crunch);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-brand-royal" /> Deadline radar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {radar.overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {radar.overdueCount} unsubmitted {radar.overdueCount === 1 ? "assignment" : "assignments"} past due.
          </div>
        )}

        {crunchWeeks.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Crunch ahead: {crunchWeeks.map((w) => w.label.toLowerCase()).join(", ")}{" "}
            {crunchWeeks.length === 1 ? "looks heavy" : "look heavy"} — start early.
          </div>
        )}

        {/* 4 rows x 7 columns; each row is one week, Monday-first feel comes free. */}
        <div className="grid grid-cols-7 gap-1.5">
          {radar.days.map((day) => (
            <DayCell key={day.date} day={day} />
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span>Less</span>
          {([0, 1, 2, 3] as RadarLevel[]).map((level) => (
            <span key={level} className={cn("h-3 w-3 rounded", LEVEL_STYLES[level])} />
          ))}
          <span>More deadlines</span>
        </div>

        <UpcomingList days={radar.days} />
      </CardContent>
    </Card>
  );
}

function DayCell({ day }: { day: RadarDay }) {
  const dayNumber = Number(day.date.slice(-2));
  const label =
    day.items.length > 0
      ? day.items.map((i) => `${i.courseName}: ${i.title}`).join("\n")
      : "Nothing due";

  return (
    <div
      title={label}
      className={cn(
        "relative flex h-12 flex-col items-center justify-center rounded-md text-xs font-medium",
        LEVEL_STYLES[day.level],
        day.isToday && "ring-2 ring-brand-royal ring-offset-1"
      )}
    >
      <span>{dayNumber}</span>
      {day.items.length > 0 && (
        <span className="mt-0.5 flex gap-0.5">
          {day.items.slice(0, 3).map((i) => (
            <span key={i.id} className="h-1 w-1 rounded-full bg-current opacity-70" />
          ))}
        </span>
      )}
    </div>
  );
}

function UpcomingList({ days }: { days: RadarDay[] }) {
  const items = days.flatMap((d) => d.items).slice(0, 8);

  if (items.length === 0) {
    return (
      <p className="border-t border-gray-100 pt-4 text-sm text-gray-400">
        Nothing due in the next four weeks. Enjoy the calm.
      </p>
    );
  }

  return (
    <ul className="space-y-2 border-t border-gray-100 pt-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-brand-dark">{item.title}</p>
            <p className="truncate text-xs text-gray-400">{item.courseName}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDateTime(item.dueAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
