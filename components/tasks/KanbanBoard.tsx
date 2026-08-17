"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { SortableTaskCard, TaskCard } from "@/components/tasks/TaskCard";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/tasks";

const STATUS_META: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: "To do", dot: "bg-gray-400" },
  in_progress: { label: "In progress", dot: "bg-amber-500" },
  done: { label: "Done", dot: "bg-emerald-500" },
};

type Columns = Record<TaskStatus, Task[]>;

function groupByStatus(tasks: Task[]): Columns {
  const columns: Columns = { todo: [], in_progress: [], done: [] };
  for (const task of tasks) columns[task.status].push(task);
  for (const status of TASK_STATUSES) {
    columns[status].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
    );
  }
  return columns;
}

interface KanbanBoardProps {
  tasks: Task[];
  onMove: (id: string, status: TaskStatus, index: number) => Promise<boolean>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
}

/**
 * Three-column kanban (To do / In progress / Done). Columns keep a local copy
 * of their tasks so dnd-kit can animate reordering during a drag; the parent
 * re-syncs them after each successful move persists.
 */
export function KanbanBoard({ tasks, onMove, onEdit, onDelete, onComplete, onAdd }: KanbanBoardProps) {
  const [columns, setColumns] = React.useState<Columns>(() => groupByStatus(tasks));
  const [prevTasks, setPrevTasks] = React.useState(tasks);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Re-sync the column copies whenever the parent's task list changes (the
  // documented "adjust state when a prop changes" pattern — see React docs).
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setColumns(groupByStatus(tasks));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findContainer = (id: string): TaskStatus | undefined => {
    if ((TASK_STATUSES as string[]).includes(id)) return id as TaskStatus;
    for (const status of TASK_STATUSES) {
      if (columns[status].some((task) => task.id === id)) return status;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const fromIndex = activeItems.findIndex((task) => task.id === activeId);
      if (fromIndex < 0) return prev;
      const [moved] = activeItems.splice(fromIndex, 1);
      const overIndex = overItems.findIndex((task) => task.id === overId);
      overItems.splice(overIndex < 0 ? overItems.length : overIndex, 0, moved);
      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const items = columns[activeContainer];
      const fromIndex = items.findIndex((task) => task.id === activeId);
      const toIndex =
        overId === overContainer ? items.length - 1 : items.findIndex((task) => task.id === overId);
      if (fromIndex < 0 || fromIndex === toIndex) return;
      setColumns((prev) => ({
        ...prev,
        [overContainer]: arrayMove(prev[overContainer], fromIndex, toIndex),
      }));
      void onMove(activeId, overContainer, toIndex);
    } else {
      const target = columns[overContainer];
      const index = target.findIndex((task) => task.id === activeId);
      void onMove(activeId, overContainer, index < 0 ? target.length : index);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setColumns(groupByStatus(tasks));
  };

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onComplete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
}: {
  status: TaskStatus;
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col rounded-lg bg-brand-gray/60 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
          <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[status].dot)} />
          {STATUS_META[status].label}
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
            {tasks.length}
          </span>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-md p-1 transition-colors",
          isOver && "bg-brand-royal/5"
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">Drop tasks here</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(status)}
        className="mt-2 flex items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-brand-royal hover:text-brand-royal"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    </div>
  );
}
