import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TasksToolbar, TaskViewToggle } from "./TasksToolbar";
import { TasksContent } from "./TasksContent";
import { EMPTY_TASK_FILTERS, type TaskFilters } from "@/lib/taskFilters";
import type { Task } from "@/types/tasks";

vi.mock("@/components/tasks/KanbanBoard", () => ({ KanbanBoard: ({ tasks }: { tasks: Task[] }) => <div>kanban:{tasks.length}</div> }));
vi.mock("@/components/tasks/ListView", () => ({ ListView: ({ sortMode }: { sortMode: string }) => <div>list:{sortMode}</div> }));

const courses = [{ id: "c1", name: "Biology", color: null }];

describe("TaskViewToggle", () => {
  it("marks the current view and reports changes", () => {
    const onChange = vi.fn();
    const onNew = vi.fn();
    render(<TaskViewToggle view="list" onChange={onChange} onNew={onNew} />);
    expect(screen.getByRole("button", { name: /List/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Kanban/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
    fireEvent.click(screen.getByRole("button", { name: /New task/ }));
    expect(onChange).toHaveBeenCalledWith("kanban");
    expect(onNew).toHaveBeenCalled();
  });
});

describe("TasksToolbar", () => {
  const setup = (filters: TaskFilters = EMPTY_TASK_FILTERS, showSort = false) => {
    const props = { onChange: vi.fn(), onClear: vi.fn(), onSortChange: vi.fn() };
    render(<TasksToolbar filters={filters} courses={courses} showSort={showSort} sortMode="smart" shown={1} total={3} {...props} />);
    return props;
  };

  it("patches each filter and hides clear/count controls while inactive", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByPlaceholderText(/Search tasks/), { target: { value: "essay" } });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "done" } });
    fireEvent.change(screen.getByLabelText("Filter by priority"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Filter by course"), { target: { value: "c1" } });
    expect(onChange.mock.calls.map(([f]) => f)).toEqual([
      { ...EMPTY_TASK_FILTERS, query: "essay" },
      { ...EMPTY_TASK_FILTERS, status: "done" },
      { ...EMPTY_TASK_FILTERS, priority: "high" },
      { ...EMPTY_TASK_FILTERS, course: "c1" },
    ]);
    expect(screen.getByRole("option", { name: "IN PROGRESS" })).toBeTruthy();
    expect(screen.queryByLabelText("Clear search")).toBeNull();
    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(screen.queryByLabelText("Sort tasks")).toBeNull();
  });

  it("shows clear controls, the match count and the sort picker when relevant", () => {
    const { onChange, onClear, onSortChange } = setup({ ...EMPTY_TASK_FILTERS, query: "essay" }, true);
    expect(screen.getByText("Showing 1 of 3 tasks")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(onChange).toHaveBeenCalledWith(EMPTY_TASK_FILTERS);
    fireEvent.click(screen.getByRole("button", { name: /Clear filters/ }));
    expect(onClear).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Sort tasks"), { target: { value: "deadline" } });
    expect(onSortChange).toHaveBeenCalledWith("deadline");
  });
});

describe("TasksContent", () => {
  const task = { id: "t1" } as Task;
  const handlers = () => ({
    onMove: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onComplete: vi.fn(),
    onAdd: vi.fn(),
    onClearFilters: vi.fn(),
  });
  const renderWith = (total: number, tasks: Task[], view: "kanban" | "list", h = handlers()) => {
    render(<TasksContent total={total} tasks={tasks} view={view} order={new Map()} sortMode="priority" {...h} />);
    return h;
  };

  it("prompts for a first task when there are none", () => {
    const h = renderWith(0, [], "kanban");
    fireEvent.click(screen.getByRole("button", { name: /Add a task/ }));
    expect(h.onAdd).toHaveBeenCalled();
  });

  it("offers to clear filters when nothing matches", () => {
    const h = renderWith(2, [], "kanban");
    expect(screen.getByText("No tasks match your filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(h.onClearFilters).toHaveBeenCalled();
  });

  it("renders the kanban board or the sorted list", () => {
    renderWith(1, [task], "kanban");
    expect(screen.getByText("kanban:1")).toBeTruthy();
    renderWith(1, [task], "list");
    expect(screen.getByText("list:priority")).toBeTruthy();
  });
});
