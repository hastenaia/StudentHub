"use client";

import { ListTodo, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ListView } from "@/components/tasks/ListView";
import type { TaskViewMode } from "@/components/tasks/TasksToolbar";
import type { TaskSortMode } from "@/lib/taskSort";
import type { Task, TaskStatus } from "@/types/tasks";

interface Props {
  /** Tasks before filtering; 0 shows the first-task prompt instead of "no matches". */
  total: number;
  tasks: Task[];
  view: TaskViewMode;
  order: Map<string, number>;
  sortMode: TaskSortMode;
  onMove: (id: string, status: TaskStatus, index: number) => Promise<boolean>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onAdd: (status?: TaskStatus) => void;
  onClearFilters: () => void;
}

/** The task board or list, or the right empty state. */
export function TasksContent({ total, tasks, view, order, sortMode, onMove, onEdit, onDelete, onComplete, onAdd, onClearFilters }: Props) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white py-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
          <ListTodo className="h-6 w-6 text-brand-royal" />
        </div>
        <p className="text-sm text-gray-500">No tasks yet. Add your first task to start planning your week.</p>
        <Button size="sm" onClick={() => onAdd()}>
          <Plus className="h-4 w-4" /> Add a task
        </Button>
      </div>
    );
  }
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white py-12 text-center">
        <Search className="h-6 w-6 text-gray-400" />
        <p className="text-sm text-gray-500">No tasks match your filters.</p>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }
  if (view === "kanban") {
    return <KanbanBoard tasks={tasks} onMove={onMove} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} onAdd={onAdd} />;
  }
  return <ListView tasks={tasks} order={order} sortMode={sortMode} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />;
}
