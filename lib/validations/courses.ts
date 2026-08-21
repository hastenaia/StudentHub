import { z } from "zod";

export const courseSchema = z.object({
  course_code: z
    .string()
    .trim()
    .max(20, "Course code must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  course_name: z
    .string()
    .trim()
    .min(1, "Course name is required")
    .max(120, "Course name is too long"),
  instructor: z
    .string()
    .trim()
    .max(80, "Instructor name is too long")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
  room: z
    .string()
    .trim()
    .max(50, "Room is too long")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .max(20, "Color is too long")
    .optional()
    .or(z.literal("")),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

export const COURSE_COLORS = [
  "#0033A0",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6366F1",
] as const;
