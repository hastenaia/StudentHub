import { z } from "zod";

export const wellnessEntrySchema = z.object({
  mood: z.number().min(1).max(5),
  journal: z.string().max(2000, "Journal entry is too long").optional().or(z.literal("")),
});

export type WellnessFormValues = z.infer<typeof wellnessEntrySchema>;
