"use client";

import * as React from "react";
import { X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { RecurrencePicker } from "@/components/tasks/RecurrencePicker";
import { taskDraftToForm, taskFormSchema, taskFormToDraft, type TaskFormValues } from "@/lib/validations/tasks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskCourseOption,
  type TaskDraft,
  type TaskStatus,
} from "@/types/tasks";

interface TaskFormProps {
  open: boolean;
  /** Non-null when editing an existing task. */
  initialDraft: TaskDraft | null;
  defaultStatus: TaskStatus;
  courses: TaskCourseOption[];
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => Promise<void>;
}

const EMPTY_VALUES: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  tags: "",
  dueAt: "",
  estimateMinutes: "",
  recurrenceFreq: "none",
  recurrenceInterval: "1",
  recurUntil: "",
  courseId: "",
};

/** Create/edit dialog for a task. */
export function TaskForm({ open, initialDraft, defaultStatus, courses, onClose, onSubmit }: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(initialDraft ? taskDraftToForm(initialDraft) : { ...EMPTY_VALUES, status: defaultStatus });
  }, [open, initialDraft, defaultStatus, form]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (values: TaskFormValues) => {
    await onSubmit(taskFormToDraft(values));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-dark">
            {initialDraft ? "Edit task" : "New task"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            <FormField
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Finish calculus problem set" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="Optional details…"
                      className={cn(
                        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {TASK_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority} className="capitalize">
                            {priority}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="estimateMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimate (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={1000} placeholder="e.g. 45" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">No course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. exam, group project (comma separated)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RecurrencePicker />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                {initialDraft ? "Save changes" : "Add task"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
