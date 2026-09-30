"use client";

import * as React from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types/tasks";
import { sortTasks, type TaskSortMode } from "@/lib/taskSort";

interface ListViewProps {
  tasks: Task[];
  /** Suggested-order rank per task id (done tasks sort to the bottom). */
  order: Map<string, number>;
  sortMode?: TaskSortMode;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

/**
 * Flat task list. Supports smart (suggested order) and explicit sorts:
 * deadline, priority, estimated effort, created date. Done tasks always sink.
 */
export function ListView({ tasks, order, sortMode = "smart", onEdit, onDelete, onComplete }: ListViewProps) {
  const sorted = React.useMemo(() => sortTasks(tasks, order, sortMode), [tasks, order, sortMode]);

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
