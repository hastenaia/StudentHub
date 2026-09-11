"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/useToast";
import { wellnessClientService } from "@/services/wellnessClient.service";
import { wellnessEntrySchema, type WellnessFormValues } from "@/lib/validations/wellness";
import { MOOD_LABELS, MOOD_EMOJI, type WellnessEntry } from "@/types/wellness";

interface Props {
  todayEntry: WellnessEntry | null;
  onSaved: (entry: WellnessEntry) => void;
  onDeleted: () => void;
}

export function MoodCheckIn({ todayEntry, onSaved, onDeleted }: Props) {
  const { toast } = useToast();
  const form = useForm<WellnessFormValues>({
    resolver: zodResolver(wellnessEntrySchema),
    defaultValues: {
      mood: todayEntry?.mood ?? 3,
      journal: todayEntry?.journal ?? "",
    },
  });

  React.useEffect(() => {
    if (todayEntry) {
      form.reset({ mood: todayEntry.mood, journal: todayEntry.journal ?? "" });
    }
  }, [todayEntry, form]);

  const mood = form.watch("mood");

  const onSubmit = async (values: WellnessFormValues) => {
    const res = await wellnessClientService.upsertEntry(values.mood, values.journal || null);
    if (res.success && res.data) {
      toast({ title: todayEntry ? "Entry updated" : "Check-in saved", description: "Your daily reflection has been saved privately.", variant: "success" });
      onSaved(res.data);
    } else {
      toast({ title: "Could not save", description: res.message, variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!todayEntry) return;
    const res = await wellnessClientService.deleteEntry(todayEntry.entryDate);
    if (res.success) {
      toast({ title: "Entry deleted", variant: "success" });
      onDeleted();
      form.reset({ mood: 3, journal: "" });
    } else {
      toast({ title: "Could not delete", description: res.message, variant: "error" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-rose-500" /> Daily Check-in
        </CardTitle>
        <CardDescription>
          How are you feeling today? This is private and for your own reflection — not a diagnosis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How is your mood today?</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                            mood === value ? "border-brand-royal bg-brand-royal/5 ring-1 ring-brand-royal" : "border-gray-200 bg-white hover:border-brand-royal/30 hover:bg-brand-gray/20"
                          }`}
                        >
                          <span className="text-2xl">{MOOD_EMOJI[value as keyof typeof MOOD_EMOJI]}</span>
                          <span className="text-xs font-medium text-brand-dark">{value}</span>
                          <span className="text-center text-[11px] leading-tight text-gray-500">{MOOD_LABELS[value as keyof typeof MOOD_LABELS]}</span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="journal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal entry (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      rows={4}
                      placeholder="What’s on your mind? What went well today? What could help tomorrow? (private, for you only)"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-400">Your journal is private and encrypted via your account. It’s a tool for reflection, not medical advice.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-gray-400">
                {todayEntry ? `Today’s entry • ${new Date(todayEntry.entryDate).toLocaleDateString()}` : "No entry yet today"}
              </div>
              <div className="flex gap-2">
                {todayEntry && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
                <Button type="submit" isLoading={form.formState.isSubmitting} className="gap-1.5">
                  <Save className="h-4 w-4" /> {todayEntry ? "Update" : "Save"} Check-in
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
