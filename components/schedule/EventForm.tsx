"use client";

import * as React from "react";
import { X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import {
  EVENT_TYPE_LABEL,
  type ScheduleCourseOption,
  type ScheduleDraft,
  type ScheduleEventType,
} from "@/types/schedule";
import { scheduleEventSchema, type ScheduleFormValues } from "@/lib/validations/schedule";

interface EventFormProps {
  open: boolean;
  initialDraft: ScheduleDraft | null;
  courses: ScheduleCourseOption[];
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => Promise<void>;
}

const EMPTY: ScheduleFormValues = {
  title: "",
  description: "",
  location: "",
  eventType: "other",
  startAt: "",
  endAt: "",
  allDay: false,
  color: "",
  courseId: "",
};

function toForm(draft: ScheduleDraft | null, defaultDate?: string): ScheduleFormValues {
  if (draft) {
    return {
      title: draft.title,
      description: draft.description ?? "",
      location: draft.location ?? "",
      eventType: draft.eventType,
      startAt: toLocal(draft.startAt),
      endAt: toLocal(draft.endAt),
      allDay: draft.allDay,
      color: draft.color ?? "",
      courseId: draft.courseId ?? "",
    };
  }
  // For new events, prefill with defaultDate if provided
  if (defaultDate) {
    const start = new Date(defaultDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { ...EMPTY, startAt: toLocal(start.toISOString()), endAt: toLocal(end.toISOString()) };
  }
  return EMPTY;
}

function toLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  // datetime-local expects local time without timezone, so we pad
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocal(local: string): string {
  return new Date(local).toISOString();
}

function toDraft(values: ScheduleFormValues): ScheduleDraft {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    location: values.location?.trim() || null,
    eventType: values.eventType as ScheduleEventType,
    startAt: fromLocal(values.startAt),
    endAt: fromLocal(values.endAt),
    allDay: values.allDay,
    color: values.color?.trim() || null,
    courseId: values.courseId || null,
  };
}

export function EventForm({ open, initialDraft, courses, defaultDate, onClose, onSubmit }: EventFormProps) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleEventSchema) as never,
    defaultValues: EMPTY,
  });

  const allDay = form.watch("allDay");

  React.useEffect(() => {
    if (!open) return;
    form.reset(toForm(initialDraft, defaultDate));
  }, [open, initialDraft, defaultDate, form]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (values: ScheduleFormValues) => {
    await onSubmit(toDraft(values as ScheduleFormValues));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-dark">
            {initialDraft ? "Edit event" : "New event"}
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
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Calculus lecture" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="">No course</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
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
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{allDay ? "Date" : "Start"}</FormLabel>
                    <FormControl>
                      <Input type={allDay ? "date" : "datetime-local"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{allDay ? "Date" : "End"}</FormLabel>
                    <FormControl>
                      <Input type={allDay ? "date" : "datetime-local"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-royal focus:ring-brand-royal"
                    />
                  </FormControl>
                  <FormLabel className="!m-0 font-normal">All day</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room 204" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="Optional details…"
                      className={cn(
                        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={field.value || "#0033A0"} onChange={field.onChange} className="h-9 w-14 p-1" />
                      <span className="text-xs text-gray-500">Pick a color for this event</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                {initialDraft ? "Save changes" : "Add event"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
