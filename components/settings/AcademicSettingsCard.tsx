"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { academicSettingsSchema, type AcademicSettingsInput } from "@/lib/validations/academics";
import { GRADE_SCALE_PRESETS } from "@/lib/gpa";
import { academicsClientService } from "@/services/academicsClient.service";
import { useToast } from "@/hooks/useToast";
import type { AcademicSettingsView } from "@/types/academics";

interface AcademicSettingsCardProps {
  settings: AcademicSettingsView;
}

/** Pick which preset best matches the user's stored scale, else default. */
function matchingPreset(scale: Record<string, number>): string {
  const exact = Object.keys(GRADE_SCALE_PRESETS).find((name) => {
    const preset = GRADE_SCALE_PRESETS[name];
    const keys = Object.keys(preset);
    return keys.length === Object.keys(scale).length && keys.every((k) => preset[k] === scale[k]);
  });
  return exact ?? Object.keys(GRADE_SCALE_PRESETS)[0];
}

export function AcademicSettingsCard({ settings }: AcademicSettingsCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<AcademicSettingsInput>({
    resolver: zodResolver(academicSettingsSchema),
    defaultValues: {
      targetGpa: String(settings.targetGpa),
      scalePreset: matchingPreset(settings.gradeScale),
    },
  });

  const onSubmit = async ({ targetGpa, scalePreset }: AcademicSettingsInput) => {
    const result = await academicsClientService.saveAcademicSettings({
      targetGpa: Number(targetGpa),
      gradeScale: GRADE_SCALE_PRESETS[scalePreset],
    });
    toast({
      title: result.success ? "Settings saved" : "Couldn't save settings",
      description: result.message,
      variant: result.success ? "success" : "error",
    });
    if (result.success) router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            name="targetGpa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target GPA</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" max="4.33" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="scalePreset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grading scale</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {Object.keys(GRADE_SCALE_PRESETS).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" isLoading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </form>
    </Form>
  );
}