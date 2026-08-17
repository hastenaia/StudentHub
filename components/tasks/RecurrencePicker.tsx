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
import { formatRecurrenceLabel } from "@/lib/scheduling";
import type { RecurrenceFreq } from "@/types/tasks";

/**
 * Repeat section of the task dialog. Reads/writes the react-hook-form context
 * (taskFormSchema fields: recurrenceFreq / recurrenceInterval / recurUntil).
 */
export function RecurrencePicker() {
  const form = useFormContext();
  const freq = (form.watch("recurrenceFreq") ?? "none") as RecurrenceFreq | "none";
  const interval = Number(form.watch("recurrenceInterval") || 1);

  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-3">
      <p className="text-xs font-medium text-brand-dark">Repeat</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      {freq !== "none" && (
        <p className="text-xs text-gray-500">
          {formatRecurrenceLabel(freq, interval)} — completing it schedules the next occurrence
          automatically.
        </p>
      )}
    </div>
  );
}
