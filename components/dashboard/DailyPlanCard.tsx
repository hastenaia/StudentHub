import Link from "next/link";
import { ArrowRight, CalendarClock, Compass, ListTodo, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { DailyPlan, PlanItem } from "@/lib/dailyPlan";
import { formatMinutes } from "@/lib/focus";
import { formatTime } from "@/utils/date";

interface DailyPlanCardProps {
  plan: DailyPlan;
}

/**
 * "What should I work on right now?" — the top of today's merged plan
 * (tasks + assignments + calendar free time), rendered server-side.
 */
export function DailyPlanCard({ plan }: DailyPlanCardProps) {
  const topItems = plan.items.slice(0, 5);
  const bestWindow = plan.freeWindows.find((w) => w.minutes >= 45) ?? plan.freeWindows[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-brand-royal" /> Today&apos;s plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topItems.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nothing on your plate right now — add tasks or sync Google Classroom to build a plan.
          </p>
        ) : (
          <>
            <ol className="space-y-3">
              {topItems.map((item, index) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gray text-xs font-semibold text-brand-royal">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
                    <p className="flex items-center gap-2 text-xs text-gray-400">
                      <KindBadge kind={item.kind} />
                      {item.reason}
                      {item.estimateMinutes != null && (
                        <span className="text-gray-300">· {formatMinutes(item.estimateMinutes)}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {plan.items.length > topItems.length && (
              <p className="text-xs text-gray-400">
                +{plan.items.length - topItems.length} more waiting behind these.
              </p>
            )}
          </>
        )}

        {bestWindow && (
          <p className="flex items-center gap-2 rounded-md bg-brand-gray/60 px-3 py-2 text-xs text-gray-600">
            <CalendarClock className="h-4 w-4 shrink-0 text-brand-royal" />
            Free block: {formatMinutes(bestWindow.minutes)} from {formatTime(bestWindow.startAt)} —
            good slot for item #{Math.min(1, topItems.length) || 1}.
          </p>
        )}

        <Link href="/dashboard/focus" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Start a focus session <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function KindBadge({ kind }: { kind: PlanItem["kind"] }) {
  if (kind === "assignment") {
    return (
      <span className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
        <FileText className="h-3 w-3" /> Due
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 font-medium text-purple-700">
      <ListTodo className="h-3 w-3" /> Task
    </span>
  );
}
