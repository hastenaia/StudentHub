"use client";

import * as React from "react";
import { X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { COURSE_COLORS, courseSchema, type CourseFormValues } from "@/lib/validations/courses";
import type { CourseDraft } from "@/types/courses";

interface CourseFormProps {
  open: boolean;
  initialDraft: CourseDraft | null;
  onClose: () => void;
  onSubmit: (draft: CourseDraft) => Promise<void>;
}

const EMPTY_VALUES: CourseFormValues = {
  course_code: "",
  course_name: "",
  instructor: "",
  description: "",
  room: "",
  color: COURSE_COLORS[0],
};

function draftToForm(draft: CourseDraft | null): CourseFormValues {
  if (!draft) return EMPTY_VALUES;
  return {
    course_code: draft.course_code ?? "",
    course_name: draft.course_name,
    instructor: draft.instructor ?? "",
    description: draft.description ?? "",
    room: draft.room ?? "",
    color: draft.color || COURSE_COLORS[0],
  };
}

function formToDraft(values: CourseFormValues): CourseDraft {
  return {
    course_code: values.course_code?.trim() ?? "",
    course_name: values.course_name.trim(),
    instructor: values.instructor?.trim() ?? "",
    description: values.description?.trim() ?? "",
    room: values.room?.trim() ?? "",
    color: values.color?.trim() ?? COURSE_COLORS[0],
  };
}

export function CourseForm({ open, initialDraft, onClose, onSubmit }: CourseFormProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: EMPTY_VALUES,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(draftToForm(initialDraft));
  }, [open, initialDraft, form]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (values: CourseFormValues) => {
    await onSubmit(formToDraft(values));
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
            {initialDraft ? "Edit course" : "New course"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="course_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CS101" {...field} />
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
                        <div className="flex flex-wrap gap-1.5">
                          {COURSE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-label={`Pick color ${c}`}
                              onClick={() => field.onChange(c)}
                              className={cn(
                                "h-7 w-7 rounded-full border-2 transition",
                                field.value === c ? "border-brand-dark scale-110" : "border-white shadow"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={field.value || COURSE_COLORS[0]}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-7 w-10 p-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="course_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Advanced Calculus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Dr. Smith" {...field} />
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
                      placeholder="Brief description of the course…"
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

            <FormField
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room 204, Building A" {...field} />
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
                {initialDraft ? "Save changes" : "Add course"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
