import { AlertTriangle, CalendarDays, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDueLabel, isOverdue } from "@/utils/date";
import type { UpcomingDeadline } from "@/services/dashboard.service";

interface Props { deadlines: UpcomingDeadline[] }

const KIND_LABEL: Record<string, string> = { task: "Task", assignment: "Assignment", event: "Event" };
const KIND_COLOR: Record<string, string> = { task: "bg-sky-100 text-sky-700", assignment: "bg-purple-100 text-purple-700", event: "bg-amber-100 text-amber-700" };

export function UpcomingDeadlines({ deadlines }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-brand-royal" /> Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No upcoming deadlines — you&apos;re ahead.</p>
        ) : (
          <ul className="space-y-2">
            {deadlines.map((d) => {
              const overdue = isOverdue(d.dueAt);
              return (
                <li key={d.id} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${overdue ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-white"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${overdue ? "bg-amber-100" : "bg-brand-gray"}`}>
                    {overdue ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Clock className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">{d.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${KIND_COLOR[d.kind] ?? "bg-gray-100 text-gray-600"}`}>
                        {KIND_LABEL[d.kind] ?? d.kind}
                      </span>
                      {d.courseName && <span className="truncate text-gray-400">{d.courseName}</span>}
                      {d.estimateMinutes && <span className="text-gray-400">~{d.estimateMinutes}m</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${overdue ? "text-amber-700" : "text-gray-500"}`}>
                    {formatDueLabel(d.dueAt)}
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
