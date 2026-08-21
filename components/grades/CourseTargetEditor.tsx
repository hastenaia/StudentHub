"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { academicsClientService } from "@/services/academicsClient.service";
import { useToast } from "@/hooks/useToast";

interface CourseTargetEditorProps {
  courseId: string;
  targetPct: number | null;
}

/**
 * Inline per-course grade goal (0-100). Saves on blur and only when the value
 * actually changed, to keep the refresh noise down.
 */
export function CourseTargetEditor({ courseId, targetPct }: CourseTargetEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const initial = targetPct != null ? String(targetPct) : "90";
  const [value, setValue] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const dirty = value !== initial;

  const save = async () => {
    if (!dirty || saving) return;

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setValue(initial);
      toast({
        title: "Invalid target",
        description: "Enter a percentage between 0 and 100.",
        variant: "error",
      });
      return;
    }

    setSaving(true);
    const result = await academicsClientService.saveCourseTarget({
      id: courseId,
      targetPct: parsed,
    });
    toast({
      title: result.success ? "Goal saved" : "Couldn't save goal",
      description: result.message,
      variant: result.success ? "success" : "error",
    });
    setSaving(false);
    if (result.success) router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`target-${courseId}`} className="text-xs text-gray-500">
        Target
      </label>
      <Input
        id={`target-${courseId}`}
        type="number"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={saving}
        className="w-16"
        aria-label="Grade goal percentage"
      />
      <span className="text-xs text-gray-500">%</span>
    </div>
  );
}
