import { z } from "zod";

/**
 * Form schemas for the settings pages. Numeric inputs are kept as strings
 * (React Hook Form's text inputs) and validated here, then converted with
 * Number() at submit — this keeps the RHF resolver's input/output types in
 * sync, which z.coerce would break.
 */

/** Manual course: name + credits are required. */
export const manualCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Course name is required")
    .max(120, "Name is too long"),
  creditHours: z
    .string()
    .trim()
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 20,
      "Credits must be between 0 and 20"
    ),
});
export type ManualCourseInput = z.infer<typeof manualCourseSchema>;