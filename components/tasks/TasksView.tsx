"use client";

import * as React from "react";
import { LayoutGrid, ListChecks, ListTodo, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { tasksClientService } from "@/services/tasksClient.service";
import { buildSchedule } from "@/lib/scheduling";
import { taskRowToView, taskToDraft } from "@/lib/taskView";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { ListView } from "@/components/tasks/ListView";
import { SuggestedOrderPanel } from "@/components/tasks/SuggestedOrderPanel";
import { TaskForm } from "@/components/tasks/TaskForm";
import { cn } from "@/utils/cn";
import type { Task, TaskDraft, TaskPriority, TaskStatus, TasksViewData } from "@/types/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/tasks";

interface TasksViewProps {
  initialData: TasksViewData;
}

type SortMode = "smart" | "deadline" | "priority" | "effort" | "created";

/** Client shell for the To-Do Tracker: view toggle, search, filters, sorting, mutations, local state. */
export function TasksView({ initialData }: TasksViewProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>(initialData.tasks);
  const [courses] = React.useState(initialData.courses);
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>("todo");

  // Search, filter, sort
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = React.useState<TaskPriority | "all">("all");
  const [filterCourse, setFilterCourse] = React.useState<string>("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("smart");

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

  const filteredTasks = React.useMemo(() => {
    let result = [...tasks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          (t.courseName && t.courseName.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }
    if (filterPriority !== "all") {
      result = result.filter((t) => t.priority === filterPriority);
    }
    if (filterCourse !== "all") {
      if (filterCourse === "none") {
        result = result.filter((t) => !t.courseId);
      } else {
        result = result.filter((t) => t.courseId === filterCourse);
      }
    }
    return result;
  }, [tasks, searchQuery, filterStatus, filterPriority, filterCourse]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || filterStatus !== "all" || filterPriority !== "all" || filterCourse !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterCourse("all");
    setSortMode("smart");
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
    const row = result.data;
    if (result.success && row) {
      applyTasks([...tasks, taskRowToView(row, courseMap)]);
      setFormOpen(false);
      notify(true, "Task created", result.message);
    } else {
      notify(false, "Couldn't create task", result.message);
    }
  };

  const handleEdit = async (draft: TaskDraft) => {
    if (!editing) return;
    const result = await tasksClientService.updateTask(editing.id, draft);
    const row = result.data;
    if (result.success && row) {
      applyTasks(tasks.map((task) => (task.id === editing.id ? taskRowToView(row, courseMap) : task)));
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
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    // Reopen if already done
    if (task.status === "done") {
      const result = await tasksClientService.moveTask(id, "todo", 0);
      if (result.success) {
        applyTasks(tasks.map((t) => (t.id === id ? { ...t, status: "todo" as TaskStatus, completedAt: null, sortOrder: 0 } : t)));
        notify(true, "Task reopened", "Moved back to To do.");
      } else {
        notify(false, "Couldn't reopen task", result.message);
      }
      return;
    }
    const result = await tasksClientService.completeTask(id);
    const row = result.data;
    if (result.success && row) {
      applyTasks(tasks.map((task) => (task.id === id ? taskRowToView(row, courseMap) : task)));
      notify(
        true,
        row.status === "done" ? "Task completed" : "Next occurrence scheduled",
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
    applyTasks(tasks.map((task) => (task.id === id ? { ...task, status, sortOrder: index } : task)));
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

      {/* Search, filter, sort toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search tasks by title, description, tags, course…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "all")}>
              <option value="all">All</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "todo" ? "TODO" : s === "in_progress" ? "IN PROGRESS" : "COMPLETED"}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Priority:</span>
            <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "all")}>
              <option value="all">All</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Course:</span>
            <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
              <option value="all">All</option>
              <option value="none">No course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {view === "list" && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Sort by:</span>
              <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                <option value="smart">Smart order</option>
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="effort">Estimated effort</option>
                <option value="created">Created date</option>
              </Select>
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-gray-500">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
        )}
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
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white py-12 text-center">
          <Search className="h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-500">No tasks match your filters.</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onMove={handleMove}
          onEdit={openEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
          onAdd={openCreate}
        />
      ) : (
        <ListView
          tasks={filteredTasks}
          order={scheduleOrder}
          sortMode={sortMode}
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
