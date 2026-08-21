import Link from "next/link";
import { CheckCircle2, Clock, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDueLabel } from "@/utils/date";
import type { Task } from "@/types/tasks";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

interface Props { tasks: Task[] }

export function PriorityTasks({ tasks }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-brand-royal" /> Priority Tasks
          </span>
          <Link href="/dashboard/tasks" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-2 text-sm font-medium text-gray-600">All caught up</p>
            <p className="text-xs text-gray-400">No priority tasks — enjoy your day.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 5).map((task, idx) => (
              <li key={task.id} className="flex items-start gap-3 rounded-md border border-gray-100 bg-white px-3 py-2.5 hover:bg-brand-gray/20">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-royal text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    {task.dueAt && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" /> {formatDueLabel(task.dueAt)}
                      </span>
                    )}
                    {task.courseName && <span className="truncate text-xs text-gray-400">{task.courseName}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
