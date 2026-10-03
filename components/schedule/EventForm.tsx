"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CourseSelectField, TextField } from "@/components/common/FormFields";
import { cn } from "@/utils/cn";
import { inferEventType } from "@/lib/eventTypeInference";
import {
  EVENT_TYPE_COLOR,
  EVENT_TYPE_LABEL,
  isScheduleEventType,
  type ScheduleCourseOption,
  type ScheduleDraft,
} from "@/types/schedule";
import {
  EMPTY_SCHEDULE_FORM,
  scheduleDraftToForm,
  scheduleEventSchema,
  scheduleFormToDraft,
  type ScheduleFormValues,
} from "@/lib/validations/schedule";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface EventFormProps {
  open: boolean;
  initialDraft: ScheduleDraft | null;
  courses: ScheduleCourseOption[];
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => Promise<void>;
}

export function EventForm({ open, initialDraft, courses, defaultDate, onClose, onSubmit }: EventFormProps) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleEventSchema) as never,
    defaultValues: EMPTY_SCHEDULE_FORM,
  });

  const allDay = useWatch({ control: form.control, name: "allDay" });
  const title = useWatch({ control: form.control, name: "title" });
  const description = useWatch({ control: form.control, name: "description" });
  const eventType = useWatch({ control: form.control, name: "eventType" });

  const selectedType = isScheduleEventType(eventType) ? eventType : "other";
  const suggestion = React.useMemo(
    () => inferEventType(title ?? "", description ?? null),
    [title, description]
  );

  const showSuggestion =
    !initialDraft &&
    !form.formState.dirtyFields.eventType &&
    suggestion.matched !== null &&
    suggestion.type !== selectedType;

  React.useEffect(() => {
    if (!open) return;
    form.reset(scheduleDraftToForm(initialDraft, defaultDate));
  }, [open, initialDraft, defaultDate, form]);

  useEscapeKey(open, onClose);

  if (!open) return null;

  const handleSubmit = async (values: ScheduleFormValues) => {
    await onSubmit(scheduleFormToDraft(values));
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
            <TextField name="title" label="Title *" placeholder="e.g. Calculus lecture" />

            {showSuggestion && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-brand-royal/30 bg-brand-royal/5 px-3 py-2 text-xs text-gray-600">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-royal" aria-hidden />
                <span className="min-w-0 flex-1">
                  Looks like <strong className="font-semibold text-brand-dark">{EVENT_TYPE_LABEL[suggestion.type]}</strong>
                  {suggestion.matched ? <> — matched “{suggestion.matched}”</> : null}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => form.setValue("eventType", suggestion.type, { shouldDirty: true })}
                >
                  Use {EVENT_TYPE_LABEL[suggestion.type]}
                </Button>
              </div>
            )}

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
              <CourseSelectField courses={courses} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
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
                    <FormLabel>End date</FormLabel>
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

            <TextField name="location" label="Location" placeholder="e.g. Room 204" />

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
              render={({ field }) => {
                const isCustom = Boolean(field.value);
                const activeColor = isCustom ? (field.value as string) : EVENT_TYPE_COLOR[selectedType];
                return (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="color" value={activeColor} onChange={field.onChange} className="h-9 w-14 p-1" />
                        <span className="text-xs text-gray-500">
                          {isCustom ? "Custom color" : `${EVENT_TYPE_LABEL[selectedType]} default`}
                        </span>
                        {isCustom && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => field.onChange("")}>
                            Use {EVENT_TYPE_LABEL[selectedType].toLowerCase()} color
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
