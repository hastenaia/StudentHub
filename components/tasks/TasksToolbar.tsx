"use client";

import { LayoutGrid, ListChecks, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CourseFilterSelect } from "@/components/common/FormFields";
import { hasActiveTaskFilters, TASK_STATUS_FILTER_LABEL, type TaskFilters } from "@/lib/taskFilters";
import type { TaskSortMode } from "@/lib/taskSort";
import type { TaskCourseOption, TaskPriority, TaskStatus } from "@/types/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/tasks";

export type TaskViewMode = "kanban" | "list";

/** Kanban / List toggle plus the "New task" button. */
export function TaskViewToggle({ view, onChange, onNew }: { view: TaskViewMode; onChange: (view: TaskViewMode) => void; onNew: () => void }) {
  const toggle = (mode: TaskViewMode, label: string, Icon: typeof LayoutGrid) => (
    <Button variant={view === mode ? "default" : "outline"} size="sm" onClick={() => onChange(mode)} aria-pressed={view === mode}>
      <Icon className="h-4 w-4" /> {label}
    </Button>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {toggle("kanban", "Kanban", LayoutGrid)}
        {toggle("list", "List", ListChecks)}
      </div>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4" /> New task
      </Button>
    </div>
  );
}

interface ToolbarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  onClear: () => void;
  courses: TaskCourseOption[];
  /** The sort picker only applies to the list view. */
  showSort: boolean;
  sortMode: TaskSortMode;
  onSortChange: (mode: TaskSortMode) => void;
  shown: number;
  total: number;
}

/** Search, filter and sort controls for the task list. */
export function TasksToolbar({ filters, onChange, onClear, courses, showSort, sortMode, onSortChange, shown, total }: ToolbarProps) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });
  const active = hasActiveTaskFilters(filters);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tasks by title, description, tags, course…"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            className="pl-9"
          />
          {filters.query && (
            <button
              onClick={() => set({ query: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {active && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" /> Clear filters
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Labelled label="Status:">
          <Select value={filters.status} onChange={(e) => set({ status: e.target.value as TaskStatus | "all" })} aria-label="Filter by status">
            <option value="all">All</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_FILTER_LABEL[s]}
              </option>
            ))}
          </Select>
        </Labelled>
        <Labelled label="Priority:">
          <Select value={filters.priority} onChange={(e) => set({ priority: e.target.value as TaskPriority | "all" })} aria-label="Filter by priority">
            <option value="all">All</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p.toUpperCase()}
              </option>
            ))}
          </Select>
        </Labelled>
        <Labelled label="Course:">
          <CourseFilterSelect courses={courses} value={filters.course} onChange={(course) => set({ course })} allLabel="All" />
        </Labelled>
        {showSort && (
          <Labelled label="Sort by:" className="ml-auto">
            <Select value={sortMode} onChange={(e) => onSortChange(e.target.value as TaskSortMode)} aria-label="Sort tasks">
              <option value="smart">Smart order</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
              <option value="effort">Estimated effort</option>
              <option value="created">Created date</option>
            </Select>
          </Labelled>
        )}
      </div>
      {active && (
        <p className="text-xs text-gray-500">
          Showing {shown} of {total} tasks
        </p>
      )}
    </div>
  );
}

function Labelled({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </div>
  );
}
