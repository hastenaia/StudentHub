import { CalendarDays, Clock, MapPin, GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/utils/date";
import type { TodayScheduleItem } from "@/services/dashboard.service";

interface Props { items: TodayScheduleItem[] }

const TYPE_ICON: Record<string, typeof BookOpen> = {
  class: GraduationCap,
  study_session: BookOpen,
  other: CalendarDays,
};

export function TodaysSchedule({ items }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-brand-royal" /> Today&apos;s Schedule
          <span className="ml-auto text-xs font-normal text-gray-400">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarDays className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No classes or events today</p>
            <p className="text-xs text-gray-400">Your schedule is clear — perfect for deep work.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = TYPE_ICON[item.eventType] ?? CalendarDays;
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-brand-gray/30 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-royal/10">
                    <Icon className="h-4 w-4 text-brand-royal" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.allDay ? "All day" : `${formatTime(item.startAt)}${item.endAt ? ` - ${formatTime(item.endAt)}` : ""}`}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {item.location}
                        </span>
                      )}
                      {item.courseName && <span className="rounded bg-white px-1.5 py-0.5 text-[11px]">{item.courseName}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${item.source === "google" ? "bg-gray-100 text-gray-500" : "bg-brand-royal text-white"}`}>
                    {item.source === "google" ? "Google" : item.eventType.replace("_", " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
