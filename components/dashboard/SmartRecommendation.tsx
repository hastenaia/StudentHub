"use client";

import { Sparkles, Clock, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { focusClientService } from "@/services/focusClient.service";
import { useToast } from "@/hooks/useToast";
import type { DashboardRecommendation } from "@/services/dashboard.service";

interface Props { recommendation: DashboardRecommendation }

export function SmartRecommendation({ recommendation }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { task, reason, estimateLabel } = recommendation;

  const handleStartFocus = async () => {
    if (!task) return;
    const mins = task.estimateMinutes ?? 25;
    const res = await focusClientService.startSession(mins, task.id, task.courseId);
    toast({ title: res.success ? "Focus started" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) router.refresh();
  };

  if (!task) {
    return (
      <Card className="border-dashed bg-brand-royal/[0.03]">
        <CardContent className="py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-brand-royal/50" />
          <p className="mt-2 text-sm font-medium text-brand-dark">Your next best action</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{reason}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-brand-royal/20 bg-gradient-to-br from-brand-royal/5 via-white to-sky-50/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-royal">
              <Sparkles className="h-3.5 w-3.5" /> Your next best action
            </p>
            <h3 className="mt-2 truncate text-lg font-semibold text-brand-dark">{task.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{reason}</span>
              {task.dueAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Due {new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {estimateLabel && <span>• {estimateLabel}</span>}
              {task.courseName && <span className="rounded bg-white px-1.5 py-0.5 text-gray-600">{task.courseName}</span>}
            </div>
          </div>
          <Button onClick={handleStartFocus} className="shrink-0">
            <Play className="h-4 w-4" /> Start Focus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
