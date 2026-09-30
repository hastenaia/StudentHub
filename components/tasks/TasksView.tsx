"use client";

import * as React from "react";
import { useToast } from "@/hooks/useToast";
import { tasksClientService } from "@/services/tasksClient.service";
import { buildSchedule } from "@/lib/scheduling";
import { formatXpToast, withXpToast } from "@/lib/gamification";
import { taskRowToView, taskToDraft } from "@/lib/taskView";
import {
  buildTaskSearchIndex,
  completionToastTitle,
  EMPTY_TASK_FILTERS,
  filterTasks,
  reopenedTask,
  toScheduleInputs,
  type TaskFilters,
} from "@/lib/taskFilters";
import { SuggestedOrderPanel } from "@/components/tasks/SuggestedOrderPanel";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TasksContent } from "@/components/tasks/TasksContent";
import { TasksToolbar, TaskViewToggle, type TaskViewMode } from "@/components/tasks/TasksToolbar";
import type { Task, TaskDraft, TaskStatus, TasksViewData } from "@/types/tasks";
import type { TaskSortMode } from "@/lib/taskSort";

interface TasksViewProps {
  initialData: TasksViewData;
}

/** Client shell for the To-Do Tracker: view toggle, search, filters, sorting, mutations, local state. */
export function TasksView({ initialData }: TasksViewProps) {
  const { notify } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>(initialData.tasks);
  const courses = initialData.courses;
  const [view, setView] = React.useState<TaskViewMode>("kanban");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>("todo");
  const [filters, setFilters] = React.useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [sortMode, setSortMode] = React.useState<TaskSortMode>("smart");

  const courseMap = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const taskById = React.useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const searchIndex = React.useMemo(() => buildTaskSearchIndex(tasks), [tasks]);
  const deferredFilters = React.useDeferredValue(filters);
  const filteredTasks = React.useMemo(() => filterTasks(tasks, searchIndex, deferredFilters), [tasks, searchIndex, deferredFilters]);

  const [schedule, setSchedule] = React.useState(initialData.schedule);
  const scheduleOrder = React.useMemo(() => new Map(schedule.map((item, index) => [item.taskId, index])), [schedule]);

  /** Apply a tasks change and re-run the scheduler in one commit. */
  const applyTasks = (next: Task[]) => {
    setTasks(next);
    setSchedule(buildSchedule(toScheduleInputs(next)));
  };
  const replaceTask = (id: string, next: Task) => applyTasks(tasks.map((t) => (t.id === id ? next : t)));

  const clearFilters = () => {
    setFilters(EMPTY_TASK_FILTERS);
    setSortMode("smart");
  };

  const handleCreate = async (draft: TaskDraft) => {
    const result = await tasksClientService.createTask(draft);
    if (!result.success || !result.data) return notify(false, "Couldn't create task", result.message);
    applyTasks([...tasks, taskRowToView(result.data, courseMap)]);
    setFormOpen(false);
    notify(true, "Task created", result.message);
  };

  const handleEdit = async (draft: TaskDraft) => {
    if (!editing) return;
    const result = await tasksClientService.updateTask(editing.id, draft);
    if (!result.success || !result.data) return notify(false, "Couldn't update task", result.message);
    replaceTask(editing.id, taskRowToView(result.data, courseMap));
    closeForm();
    notify(true, "Task updated", withXpToast(result.message, result.xp));
  };

  const handleDelete = async (id: string) => {
    const result = await tasksClientService.deleteTask(id);
    if (!result.success) return notify(false, "Couldn't delete task", result.message);
    applyTasks(tasks.filter((task) => task.id !== id));
    notify(true, "Task deleted", result.message);
  };

  const reopen = async (task: Task) => {
    const result = await tasksClientService.moveTask(task.id, "todo", 0);
    if (!result.success) return notify(false, "Couldn't reopen task", result.message);
    replaceTask(task.id, reopenedTask(task));
    notify(true, "Task reopened", "Moved back to To do.");
  };

  const complete = async (id: string) => {
    const result = await tasksClientService.completeTask(id);
    if (!result.success || !result.data) return notify(false, "Couldn't complete task", result.message);
    replaceTask(id, taskRowToView(result.data, courseMap));
    notify(true, completionToastTitle(result.data.status), withXpToast(result.message, result.xp));
  };

  /** Toggles completion: a done task is reopened. */
  const handleComplete = async (id: string) => {
    const task = taskById.get(id);
    if (!task) return;
    await (task.status === "done" ? reopen(task) : complete(id));
  };

  const handleMove = async (id: string, status: TaskStatus, index: number): Promise<boolean> => {
    const result = await tasksClientService.moveTask(id, status, index);
    if (!result.success) {
      notify(false, "Couldn't move task", result.message);
      return false;
    }
    applyTasks(tasks.map((task) => (task.id === id ? { ...task, status, sortOrder: index } : task)));
    const xpMsg = formatXpToast(result.xp);
    if (xpMsg) notify(true, "Task completed", xpMsg);
    return true;
  };

  const openForm = (task: Task | null, status: TaskStatus) => {
    setEditing(task);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <TaskViewToggle view={view} onChange={setView} onNew={() => openForm(null, "todo")} />

      <TasksToolbar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        courses={courses}
        showSort={view === "list"}
        sortMode={sortMode}
        onSortChange={setSortMode}
        shown={filteredTasks.length}
        total={tasks.length}
      />

      <SuggestedOrderPanel schedule={schedule} />

      <TasksContent
        total={tasks.length}
        tasks={filteredTasks}
        view={view}
        order={scheduleOrder}
        sortMode={sortMode}
        onMove={handleMove}
        onEdit={(task) => openForm(task, task.status)}
        onDelete={handleDelete}
        onComplete={handleComplete}
        onAdd={(status = "todo") => openForm(null, status)}
        onClearFilters={clearFilters}
      />

      <TaskForm
        open={formOpen}
        initialDraft={editing && taskToDraft(editing)}
        defaultStatus={defaultStatus}
        courses={courses}
        onClose={closeForm}
        onSubmit={editing ? handleEdit : handleCreate}
      />
    </div>
  );
}
