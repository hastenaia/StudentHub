import { z } from "zod";
import { SCHEDULE_EVENT_TYPES, type ScheduleDraft, type ScheduleEventType } from "@/types/schedule";
import { toLocalInputValue } from "@/lib/validations/tasks";
import { trimOrNull } from "@/utils/text";

export const scheduleEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
    description: z.string().trim().max(500, "Description is too long").optional().or(z.literal("")),
    location: z.string().trim().max(100, "Location is too long").optional().or(z.literal("")),
    eventType: z.enum(SCHEDULE_EVENT_TYPES as unknown as [string, ...string[]]),
    startAt: z.string().min(1, "Start date is required"),
    endAt: z.string().min(1, "End date is required"),
    allDay: z.boolean(),
    color: z.string().trim().max(20).optional().or(z.literal("")),
    courseId: z.string().optional().or(z.literal("")).or(z.null()),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End must be after start",
    path: ["endAt"],
  });

export type ScheduleFormValues = z.infer<typeof scheduleEventSchema>;

export const EMPTY_SCHEDULE_FORM: ScheduleFormValues = {
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

const toLocal = (iso: string): string => (iso ? toLocalInputValue(iso) : "");

/** A new event on `defaultDate` defaults to 09:00–10:00 local time. */
function newEventForm(defaultDate?: string): ScheduleFormValues {
  if (!defaultDate) return EMPTY_SCHEDULE_FORM;
  const start = new Date(defaultDate);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { ...EMPTY_SCHEDULE_FORM, startAt: toLocal(start.toISOString()), endAt: toLocal(end.toISOString()) };
}

/** Form values for editing `draft`, or for a new event (optionally prefilled on `defaultDate`). */
export function scheduleDraftToForm(draft: ScheduleDraft | null, defaultDate?: string): ScheduleFormValues {
  if (!draft) return newEventForm(defaultDate);
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

export function scheduleFormToDraft(values: ScheduleFormValues): ScheduleDraft {
  return {
    title: values.title.trim(),
    description: trimOrNull(values.description),
    location: trimOrNull(values.location),
    eventType: values.eventType as ScheduleEventType,
    startAt: new Date(values.startAt).toISOString(),
    endAt: new Date(values.endAt).toISOString(),
    allDay: values.allDay,
    color: trimOrNull(values.color),
    courseId: values.courseId || null,
  };
}
