import { z } from "zod";
import { SCHEDULE_EVENT_TYPES } from "@/types/schedule";

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
