"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatRecurrenceLabel, WEEKDAY_LABELS } from "@/lib/scheduling";
import type { RecurrenceFreq } from "@/types/tasks";

/**
 * Repeat section of the task dialog. Reads/writes the react-hook-form context
 * (taskFormSchema fields: recurrenceFreq / recurrenceInterval / recurUntil).
 */
export function RecurrencePicker() {
  const form = useFormContext();
  const freq = (form.watch("recurrenceFreq") ?? "none") as RecurrenceFreq | "none";
  const interval = Number(form.watch("recurrenceInterval") || 1);
  const days = (form.watch("recurrenceDays") ?? []) as number[];
  const pickDays = freq === "weekly" || freq === "monthly";

  const toggleDay = (day: number) =>
    form.setValue(
      "recurrenceDays",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      { shouldDirty: true }
    );
  const dayOptions = freq === "weekly" ? WEEKDAY_LABELS.map((label, value) => ({ label, value })) : Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));

  return (
    <div
      className={`space-y-3 rounded-md border border-gray-200 p-3 ${freq === "none" ? "w-fit max-w-full" : ""}`}
    >
      <p className="text-xs font-medium text-brand-dark">Repeat</p>
      <div className={`grid grid-cols-1 gap-3 ${freq === "none" ? "" : "sm:grid-cols-3"}`}>
        <FormField
          name="recurrenceFreq"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {freq !== "none" && (
          <>
            {freq === "daily" && (
            <FormField
              name="recurrenceInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Every</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={31} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}
            <FormField
              name="recurUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Until (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>
      {pickDays && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-brand-dark">
            {freq === "weekly" ? "Repeat on" : "Repeat on day of month"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dayOptions.map(({ label, value }) => {
              const active = days.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDay(value)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-brand-royal bg-brand-royal text-white"
                      : "border-gray-200 text-brand-dark hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">Leave empty to repeat from the due date.</p>
        </div>
      )}
      {freq !== "none" && (
        <p className="text-xs text-gray-500">
          {formatRecurrenceLabel(freq, interval, days)} — completing it schedules the next occurrence
          automatically.
        </p>
      )}
    </div>
  );
}
