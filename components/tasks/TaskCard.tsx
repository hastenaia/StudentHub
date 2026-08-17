"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Clock, Pencil, Repeat, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDueLabel, isOverdue } from "@/utils/date";
import { formatRecurrenceLabel } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import type { Task, TaskPriority } from "@/types/tasks";

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-gray-100 text-gray-600",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        PRIORITY_BADGE[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function DueChip({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const overdue = isOverdue(dueAt);
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium",
        overdue ? "text-red-600" : "text-gray-500"
      )}
    >
      <Clock className="h-3 w-3" />
      {formatDueLabel(dueAt)}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  /** Props spread from useSortable (listeners + attributes) when draggable. */
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, dragHandleProps, isDragging, style, onEdit, onDelete, onComplete }, ref) => {
    const done = task.status === "done";
    return (
      <div
        ref={ref}
        style={style}
        {...dragHandleProps}
        className={cn(
          "group rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
          dragHandleProps && "cursor-grab active:cursor-grabbing",
          done && "opacity-60",
          isDragging && "opacity-40"
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onComplete(task.id)}
            aria-label={done ? "Reopen task" : "Mark task complete"}
            className={cn(
              "mt-0.5 shrink-0 transition-colors",
              done ? "text-emerald-500" : "text-gray-300 hover:text-emerald-500"
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <p
            className={cn(
              "min-w-0 flex-1 text-sm font-medium text-brand-dark",
              done && "text-gray-400 line-through"
            )}
          >
            {task.title}
          </p>
          <PriorityBadge priority={task.priority} />
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{task.description}</p>
        )}

        {(task.dueAt || task.courseName || task.estimateMinutes != null || task.recurrenceFreq) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {task.dueAt && <DueChip dueAt={task.dueAt} />}
            {task.courseName && (
              <span className="flex min-w-0 items-center gap-1 text-[11px] text-gray-500">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.courseColor ?? "#9CA3AF" }}
                />
                <span className="truncate">{task.courseName}</span>
              </span>
            )}
            {task.estimateMinutes != null && (
              <span className="text-[11px] text-gray-400">{task.estimateMinutes}m</span>
            )}
            {task.recurrenceFreq && (
              <span
                className="flex items-center gap-1 text-[11px] text-gray-400"
                title={formatRecurrenceLabel(task.recurrenceFreq, task.recurrenceInterval)}
              >
                <Repeat className="h-3 w-3" />
                {formatRecurrenceLabel(task.recurrenceFreq, task.recurrenceInterval)}
              </span>
            )}
          </div>
        )}

        {task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-brand-gray px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-1 border-t border-gray-100 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" onClick={() => onEdit(task)} aria-label="Edit task">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }
);
TaskCard.displayName = "TaskCard";

/** TaskCard wired up for dnd-kit dragging (used in the kanban columns). */
export function SortableTaskCard(props: Omit<TaskCardProps, "dragHandleProps" | "isDragging">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });
  return (
    <TaskCard
      ref={setNodeRef}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...props}
    />
  );
}

export { TaskCard };
