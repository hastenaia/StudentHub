"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduledItem } from "@/lib/scheduling";

interface SuggestedOrderPanelProps {
  schedule: ScheduledItem[];
}

/** The "do this next" list produced by the min-heap scheduler. */
export function SuggestedOrderPanel({ schedule }: SuggestedOrderPanelProps) {
  if (schedule.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-royal" /> Suggested order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {schedule.slice(0, 8).map((item, index) => (
            <li
              key={item.taskId}
              className="flex items-start gap-3 rounded-md border border-gray-100 bg-brand-gray/40 px-3 py-2"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-royal text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
                <p className="text-xs text-gray-500">{item.reason}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
          <ArrowRight className="h-3 w-3" />
          Ordered by the min-heap queue: overdue first, then due date, priority and effort.
        </p>
      </CardContent>
    </Card>
  );
}
