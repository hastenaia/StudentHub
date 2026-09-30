import type { Task } from "@/types/tasks";

// Pure ordering for the task list view (components/tasks/ListView.tsx).

export type TaskSortMode = "smart" | "deadline" | "priority" | "effort" | "created";

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type Decorated = { task: Task; dueMs: number; createdMs: number };
type Compare = (a: Decorated, b: Decorated) => number;

const byManualOrder: Compare = (a, b) => a.task.sortOrder - b.task.sortOrder;
const byDue: Compare = (a, b) => (a.dueMs === b.dueMs ? 0 : a.dueMs - b.dueMs);
/** Missing estimates sort last. */
const byEffort: Compare = (a, b) => {
  const ea = a.task.estimateMinutes ?? Infinity;
  const eb = b.task.estimateMinutes ?? Infinity;
  return ea === eb ? 0 : ea - eb;
};
const byPriority: Compare = (a, b) => (PRIORITY_WEIGHT[a.task.priority] ?? 99) - (PRIORITY_WEIGHT[b.task.priority] ?? 99);

/** First non-zero comparison wins. */
const chain = (...compares: Compare[]): Compare => (a, b) => {
  for (const compare of compares) {
    const result = compare(a, b);
    if (result !== 0) return result;
  }
  return 0;
};

function modeComparator(mode: TaskSortMode, order: Map<string, number>): Compare {
  switch (mode) {
    case "smart": {
      const rank = (d: Decorated) => order.get(d.task.id) ?? Number.MAX_SAFE_INTEGER;
      return chain((a, b) => rank(a) - rank(b), byManualOrder);
    }
    case "deadline":
      return chain(byDue, byManualOrder);
    case "priority":
      return chain(byPriority, byDue, byManualOrder);
    case "effort":
      return chain(byEffort, byManualOrder);
    case "created":
      return (a, b) => b.createdMs - a.createdMs;
  }
}

const isDone = (d: Decorated) => (d.task.status === "done" ? 1 : 0);

/** Sorts tasks for display; done tasks always sink below open ones. */
export function sortTasks(tasks: Task[], order: Map<string, number>, mode: TaskSortMode): Task[] {
  // Decorate once: parse dates a single time instead of per-comparison.
  const decorated = tasks.map((task) => ({
    task,
    dueMs: task.dueAt ? Date.parse(task.dueAt) || Infinity : Infinity,
    createdMs: task.createdAt ? Date.parse(task.createdAt) || 0 : 0,
  }));
  decorated.sort(chain((a, b) => isDone(a) - isDone(b), modeComparator(mode, order)));
  return decorated.map((d) => d.task);
}
