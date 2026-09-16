"use client";
import * as React from "react";
import { Settings2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PomodoroDurations } from "@/lib/focus";
import { validateDurations } from "@/lib/focus";

export type PomodoroPreset = PomodoroDurations;

const PRESETS: Record<string, PomodoroDurations> = {
  "25/5": { focus: 25, break: 5, longBreak: 15 },
  "50/10": { focus: 50, break: 10, longBreak: 20 },
};

/**
 * Controlled preset picker for Pomodoro durations.
 *
 * - Displays quick preset pills (25/5, 50/10) and a Custom editor.
 * - Validates focus 1–120, break 1–30, longBreak 5–60 with longBreak >= break.
 * - Edits auto-pause the running timer (parent handles pause via onDurationsChange).
 * - No localStorage here — parent (Focus page) owns persistence through the
 *   legacy timer key so there is a single source of truth.
 */
export function PomodoroPresets({
  durations,
  onDurationsChange,
  disabled,
}: {
  durations: PomodoroDurations;
  onDurationsChange: (d: PomodoroDurations) => void;
  disabled?: boolean;
}) {
  // Local editable copy for custom inputs — decoupled so typing doesn't jitter parent until Apply.
  const [custom, setCustom] = React.useState<PomodoroDurations>(durations);
  const [showCustom, setShowCustom] = React.useState(false);
  const [active, setActive] = React.useState<string>("");

  // Derive active preset key from durations.
  // Only syncs active/showCustom from durations; does NOT overwrite `custom`
  // draft to avoid losing in-progress edits. Custom draft stays until user
  // clicks Apply. This prevents "Custom opens then immediately closes" when
  // durations matches a preset and user clicks Custom (persist only on Apply).
  React.useEffect(() => {
    let matched = "";
    for (const [k, v] of Object.entries(PRESETS)) {
      if (v.focus === durations.focus && v.break === durations.break && v.longBreak === durations.longBreak) {
        matched = k;
        break;
      }
    }
    if (matched) {
      setActive(matched);
      setShowCustom(false);
    } else {
      setActive("custom");
      setShowCustom(true);
    }
  }, [durations]);

  // Validate custom inputs before allowing Apply.
  const customValidation = validateDurations(custom);
  const errorMsg = !customValidation
    ? custom.longBreak < custom.break
      ? "Long break must be ≥ short break."
      : custom.focus < 1 || custom.focus > 120
        ? "Focus must be 1–120 min."
        : custom.break < 1 || custom.break > 30
          ? "Break must be 1–30 min."
          : custom.longBreak < 5 || custom.longBreak > 60
            ? "Long break must be 5–60 min."
            : "Invalid durations."
    : null;

  const applyPreset = (key: string) => {
    if (disabled) return;
    if (key === "custom") {
      // Persist only on Apply — just open editor, don't push durations yet.
      setShowCustom(true);
      setActive("custom");
      return;
    }
    const preset = PRESETS[key];
    if (preset) {
      setActive(key);
      setShowCustom(false);
      onDurationsChange(preset);
    }
  };

  const applyCustom = () => {
    if (!customValidation || disabled) return;
    onDurationsChange(customValidation);
    setActive("custom");
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-brand-gray/40 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <Settings2 className="h-3.5 w-3.5" /> Pomodoro presets
        {disabled && <span className="ml-auto text-xs text-amber-600">Paused to edit</span>}
      </p>

      {/* Preset pills — disabled while timer ticking is handled by parent auto-pause, but we still guard here. */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((k) => (
          <Button key={k} size="sm" variant={active === k ? "default" : "outline"} onClick={() => applyPreset(k)} disabled={disabled}>
            {k}
          </Button>
        ))}
        <Button size="sm" variant={active === "custom" ? "default" : "outline"} onClick={() => applyPreset("custom")} disabled={disabled}>
          Custom
        </Button>
      </div>

      {/* Custom editor — always visible when active is custom, or toggled. */}
      {showCustom && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="custom-focus" className="text-xs">
                Focus (min)
              </Label>
              <Input
                id="custom-focus"
                type="number"
                min={1}
                max={120}
                value={custom.focus}
                onChange={(e) => {
                  const v = e.target.value === "" ? 1 : Math.trunc(Number(e.target.value));
                  setCustom((prev) => ({ ...prev, focus: Number.isFinite(v) ? v : 1 }));
                }}
                error={!!errorMsg && (custom.focus < 1 || custom.focus > 120)}
                aria-describedby={errorMsg ? "preset-error" : undefined}
              />
            </div>
            <div>
              <Label htmlFor="custom-break" className="text-xs">
                Break
              </Label>
              <Input
                id="custom-break"
                type="number"
                min={1}
                max={30}
                value={custom.break}
                onChange={(e) => {
                  const v = e.target.value === "" ? 1 : Math.trunc(Number(e.target.value));
                  setCustom((prev) => ({ ...prev, break: Number.isFinite(v) ? v : 1 }));
                }}
                error={!!errorMsg && (custom.break < 1 || custom.break > 30 || custom.longBreak < custom.break)}
              />
            </div>
            <div>
              <Label htmlFor="custom-long" className="text-xs">
                Long break
              </Label>
              <Input
                id="custom-long"
                type="number"
                min={5}
                max={60}
                value={custom.longBreak}
                onChange={(e) => {
                  const v = e.target.value === "" ? 5 : Math.trunc(Number(e.target.value));
                  setCustom((prev) => ({ ...prev, longBreak: Number.isFinite(v) ? v : 5 }));
                }}
                error={!!errorMsg && (custom.longBreak < 5 || custom.longBreak > 60 || custom.longBreak < custom.break)}
              />
            </div>
          </div>

          {/* Inline validation feedback — best practice: show why Apply is disabled. */}
          {errorMsg && (
            <p id="preset-error" className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" /> {errorMsg}
            </p>
          )}

          <Button size="sm" className="w-full" onClick={applyCustom} disabled={!customValidation || disabled}>
            Apply custom
          </Button>
          <p className="text-xs text-gray-400">Changes auto-pause the timer and apply immediately; remaining time adjusts if at phase start.</p>
        </div>
      )}

      {/* Summary of current durations — always visible for confirmation. */}
      <p className="text-xs text-gray-500">
        Current: <span className="font-medium text-brand-dark">{durations.focus}m focus</span> · {durations.break}m break · {durations.longBreak}m long
      </p>
    </div>
  );
}
