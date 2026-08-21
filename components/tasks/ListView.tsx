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
  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    if (sortMode === "smart") {
      const aRank = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.sortOrder - b.sortOrder;
    }
    if (sortMode === "deadline") {
      if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (sortMode === "priority") {
      const aw = PRIORITY_WEIGHT[a.priority] ?? 99;
      const bw = PRIORITY_WEIGHT[b.priority] ?? 99;
      if (aw !== bw) return aw - bw;
      // tie-break by due date
      if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return a.sortOrder - b.sortOrder;
    }
    if (sortMode === "effort") {
      if (a.estimateMinutes == null && b.estimateMinutes == null) return a.sortOrder - b.sortOrder;
      if (a.estimateMinutes == null) return 1;
      if (b.estimateMinutes == null) return -1;
      if (a.estimateMinutes !== b.estimateMinutes) return a.estimateMinutes - b.estimateMinutes;
      return a.sortOrder - b.sortOrder;
    }
    if (sortMode === "created") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.sortOrder - b.sortOrder;
  });

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
