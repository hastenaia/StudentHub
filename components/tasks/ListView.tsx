"use client";

import * as React from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types/tasks";

interface ListViewProps {
  tasks: Task[];
  /** Suggested-order rank per task id (done tasks sort to the bottom). */
  order: Map<string, number>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

/**
 * Flat task list. Actionable tasks follow the scheduler's suggested order;
 * done tasks sink to the bottom.
 */
export function ListView({ tasks, order, onEdit, onDelete, onComplete }: ListViewProps) {
  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aRank = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
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
