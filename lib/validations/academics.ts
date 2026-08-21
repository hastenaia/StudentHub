import { z } from "zod";

/**
 * Form schemas for the settings pages. Numeric inputs are kept as strings
 * (React Hook Form's text inputs) and validated here, then converted with
 * Number() at submit — this keeps the RHF resolver's input/output types in
 * sync, which z.coerce would break.
 */

/** Settings: GPA target must sit within the classic 0-4.33 range. */
export const academicSettingsSchema = z.object({
  targetGpa: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)), "Enter a number")
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 4.33,
      "Target GPA must be between 0 and 4.33"
    ),
  /** Key of a GRADE_SCALE_PRESETS entry; resolved to the scale on save. */
  scalePreset: z.string().min(1, "Pick a grade scale"),
});
export type AcademicSettingsInput = z.infer<typeof academicSettingsSchema>;

/** Manual course: name + credits are required; grading is optional. */
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
  /** Optional letter grade (from the configured scale). */
  gradeLetter: z.string().optional(),
});
export type ManualCourseInput = z.infer<typeof manualCourseSchema>;