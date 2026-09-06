"use client";

import * as React from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types/tasks";

type SortMode = "smart" | "deadline" | "priority" | "effort" | "created";

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface ListViewProps {
  tasks: Task[];
  /** Suggested-order rank per task id (done tasks sort to the bottom). */
  order: Map<string, number>;
  sortMode?: SortMode;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

/**
 * Flat task list. Supports smart (suggested order) and explicit sorts:
 * deadline, priority, estimated effort, created date. Done tasks always sink.
 */
export function ListView({ tasks, order, sortMode = "smart", onEdit, onDelete, onComplete }: ListViewProps) {
  const sorted = React.useMemo(() => {
    // Decorate once: parse dates a single time instead of per-comparison.
    const decorated = tasks.map((t) => ({
      task: t,
      dueMs: t.dueAt ? Date.parse(t.dueAt) || Infinity : Infinity,
      createdMs: t.createdAt ? Date.parse(t.createdAt) || 0 : 0,
    }));
    decorated.sort((a, b) => {
      const ta = a.task;
      const tb = b.task;
      const aDone = ta.status === "done" ? 1 : 0;
      const bDone = tb.status === "done" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      if (sortMode === "smart") {
        const aRank = order.get(ta.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = order.get(tb.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return ta.sortOrder - tb.sortOrder;
      }
      if (sortMode === "deadline") {
        if (a.dueMs === Infinity && b.dueMs === Infinity) return ta.sortOrder - tb.sortOrder;
        return a.dueMs - b.dueMs;
      }
      if (sortMode === "priority") {
        const aw = PRIORITY_WEIGHT[ta.priority] ?? 99;
        const bw = PRIORITY_WEIGHT[tb.priority] ?? 99;
        if (aw !== bw) return aw - bw;
        // tie-break by due date
        if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
        return ta.sortOrder - tb.sortOrder;
      }
      if (sortMode === "effort") {
        if (ta.estimateMinutes == null && tb.estimateMinutes == null) return ta.sortOrder - tb.sortOrder;
        if (ta.estimateMinutes == null) return 1;
        if (tb.estimateMinutes == null) return -1;
        if (ta.estimateMinutes !== tb.estimateMinutes) return ta.estimateMinutes - tb.estimateMinutes;
        return ta.sortOrder - tb.sortOrder;
      }
      if (sortMode === "created") {
        return b.createdMs - a.createdMs;
      }
      return ta.sortOrder - tb.sortOrder;
    });
    return decorated.map((d) => d.task);
  }, [tasks, order, sortMode]);

  return (
    <div className="space-y-2">
      {sorted.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}
