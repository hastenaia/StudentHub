"use client";

import * as React from "react";
import { LayoutGrid, ListChecks, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { tasksClientService } from "@/services/tasksClient.service";
import { buildSchedule } from "@/lib/scheduling";
import { taskRowToView, taskToDraft } from "@/lib/taskView";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ListView } from "@/components/tasks/ListView";
import { SuggestedOrderPanel } from "@/components/tasks/SuggestedOrderPanel";
import { TaskForm } from "@/components/tasks/TaskForm";
import { cn } from "@/utils/cn";
import type { Task, TaskDraft, TaskStatus, TasksViewData } from "@/types/tasks";

interface TasksViewProps {
  initialData: TasksViewData;
}

/** Client shell for the To-Do Tracker: view toggle, mutations, local state. */
export function TasksView({ initialData }: TasksViewProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>(initialData.tasks);
  const [courses] = React.useState(initialData.courses);
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>("todo");

  const courseMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const [schedule, setSchedule] = React.useState(initialData.schedule);
  const scheduleOrder = React.useMemo(
    () => new Map(schedule.map((item, index) => [item.taskId, index])),
    [schedule]
  );

  /** Apply a tasks change and re-run the min-heap scheduler in one commit. */
  const applyTasks = (next: Task[]) => {
    setTasks(next);
    setSchedule(
      buildSchedule(
        next
          .filter((task) => task.status !== "done")
          .map((task) => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            dueAt: task.dueAt,
            estimateMinutes: task.estimateMinutes,
          }))
      )
    );
  };

  const notify = (success: boolean, title: string, description?: string) => {
    toast({
      title,
      description,
      variant: success ? "success" : "error",
    });
  };

  const handleCreate = async (draft: TaskDraft) => {
    const result = await tasksClientService.createTask(draft);
    if (result.success && result.data) {
      applyTasks([...tasks, taskRowToView(result.data, courseMap)]);
      setFormOpen(false);
      notify(true, "Task created", result.message);
    } else {
      notify(false, "Couldn't create task", result.message);
    }
  };

  const handleEdit = async (draft: TaskDraft) => {
    if (!editing) return;
    const result = await tasksClientService.updateTask(editing.id, draft);
    if (result.success && result.data) {
      applyTasks(
        tasks.map((task) => (task.id === editing.id ? taskRowToView(result.data, courseMap) : task))
      );
      setFormOpen(false);
      setEditing(null);
      notify(true, "Task updated", result.message);
    } else {
      notify(false, "Couldn't update task", result.message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await tasksClientService.deleteTask(id);
    if (result.success) {
      applyTasks(tasks.filter((task) => task.id !== id));
      notify(true, "Task deleted", result.message);
    } else {
      notify(false, "Couldn't delete task", result.message);
    }
  };

  const handleComplete = async (id: string) => {
    const result = await tasksClientService.completeTask(id);
    if (result.success && result.data) {
      applyTasks(
        tasks.map((task) => (task.id === id ? taskRowToView(result.data, courseMap) : task))
      );
      notify(
        true,
        result.data.status === "done" ? "Task completed" : "Next occurrence scheduled",
        result.message
      );
    } else {
      notify(false, "Couldn't complete task", result.message);
    }
  };

  const handleMove = async (id: string, status: TaskStatus, index: number): Promise<boolean> => {
    const result = await tasksClientService.moveTask(id, status, index);
    if (!result.success) {
      notify(false, "Couldn't move task", result.message);
      return false;
    }
    return true;
  };

  const openCreate = (status: TaskStatus = "todo") => {
    setEditing(null);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setDefaultStatus(task.status);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
            aria-pressed={view === "kanban"}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <ListChecks className="h-4 w-4" /> List
          </Button>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <SuggestedOrderPanel schedule={schedule} />

      {tasks.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white py-12 text-center shadow-sm"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
            <ListTodo className="h-6 w-6 text-brand-royal" />
          </div>
          <p className="text-sm text-gray-500">
            No tasks yet. Add your first task to start planning your week.
          </p>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Add a task
          </Button>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onMove={handleMove}
          onEdit={openEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
          onAdd={openCreate}
        />
      ) : (
        <ListView
          tasks={tasks}
          order={scheduleOrder}
          onEdit={openEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
        />
      )}

      <TaskForm
        open={formOpen}
        initialDraft={editing ? taskToDraft(editing) : null}
        defaultStatus={defaultStatus}
        courses={courses}
        onClose={closeForm}
        onSubmit={editing ? handleEdit : handleCreate}
      />
    </div>
  );
}
