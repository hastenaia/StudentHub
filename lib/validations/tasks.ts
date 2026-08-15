import { z } from "zod";
import type { TaskDraft } from "@/types/tasks";

/**
 * Form schema + converters for the task dialog. Numeric/date fields stay as
 * strings (native inputs) and are converted to their typed values on submit,
 * matching the settings-page convention.
 */

const STATUS_VALUES = ["todo", "in_progress", "done"] as const;
const PRIORITY_VALUES = ["urgent", "high", "medium", "low"] as const;
const FREQ_VALUES = ["daily", "weekly", "monthly", "none"] as const;

const MINUTES_FIELD = z
  .string()
  .trim()
  .default("")
  .refine(
    (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 1000),
    "Estimate must be 1-1000 minutes"
  );

const INTERVAL_FIELD = z
  .string()
  .trim()
  .default("1")
  .refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 31,
    "Interval must be 1-31"
  );

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").default(""),
  status: z.enum(STATUS_VALUES),
  priority: z.enum(PRIORITY_VALUES),
  tags: z.string().trim().max(300, "Tags are too long"),
  dueAt: z.string().default(""),
  estimateMinutes: MINUTES_FIELD,
  recurrenceFreq: z.enum(FREQ_VALUES).default("none"),
  recurrenceInterval: INTERVAL_FIELD,
  recurUntil: z.string().default(""),
  courseId: z.string().default(""),
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;

/** datetime-local input value ("2026-08-20T14:30") from an ISO timestamp. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/** Convert validated form values into the service payload. */
export function taskFormToDraft(values: TaskFormValues): TaskDraft {
  return {
    title: values.title,
    description: values.description ? values.description : null,
    status: values.status,
    priority: values.priority,
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10),
    dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
    estimateMinutes: values.estimateMinutes ? Number(values.estimateMinutes) : null,
    recurrenceFreq: values.recurrenceFreq === "none" ? null : values.recurrenceFreq,
    recurrenceInterval: Number(values.recurrenceInterval),
    recurUntil: values.recurUntil ? new Date(values.recurUntil).toISOString() : null,
    courseId: values.courseId || null,
  };
}

/** Prefill form values from an existing task. */
export function taskDraftToForm(draft: TaskDraft): TaskFormValues {
  return {
    title: draft.title,
    description: draft.description ?? "",
    status: draft.status,
    priority: draft.priority,
    tags: draft.tags.join(", "),
    dueAt: draft.dueAt ? toLocalInputValue(draft.dueAt) : "",
    estimateMinutes: draft.estimateMinutes ? String(draft.estimateMinutes) : "",
    recurrenceFreq: draft.recurrenceFreq ?? "none",
    recurrenceInterval: String(draft.recurrenceInterval),
    recurUntil: draft.recurUntil ? draft.recurUntil.slice(0, 10) : "",
    courseId: draft.courseId ?? "",
  };
}
