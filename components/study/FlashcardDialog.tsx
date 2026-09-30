"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CourseSelectField, TextField } from "@/components/common/FormFields";
import { useToast } from "@/hooks/useToast";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import { flashcardSchema, type FlashcardFormValues } from "@/lib/validations/study";
import { flashcardFormToDraft, flashcardToFormValues } from "@/lib/flashcardView";
import type { CourseOption, Flashcard } from "@/types/study";

interface Props {
  /** null = new card. */
  editing: Flashcard | null;
  courses: CourseOption[];
  notes: { id: string; title: string }[];
  onClose: () => void;
  onSaved: (card: Flashcard) => void;
}

export function FlashcardDialog({ editing, courses, notes, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const form = useForm<FlashcardFormValues>({ resolver: zodResolver(flashcardSchema), defaultValues: flashcardToFormValues(editing) });

  const onSubmit = async (values: FlashcardFormValues) => {
    const draft = flashcardFormToDraft(values);
    const res = editing ? await flashcardsClientService.updateFlashcard(editing.id, draft) : await flashcardsClientService.createFlashcard(draft);
    if (!res.success || !res.data) return toast({ title: "Failed", description: res.message, variant: "error" });
    // The client service can't resolve course names; fill them from the page's courses.
    onSaved({ ...res.data, courseName: courses.find((c) => c.id === res.data!.courseId)?.name ?? null });
    toast({ title: editing ? "Flashcard updated" : "Flashcard created", variant: "success" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={editing ? "Edit flashcard" : "New flashcard"} className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{editing ? "Edit flashcard" : "New flashcard"}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <TextField name="front" label="Front *" />
            <FormField name="back" render={({ field }) => (
              <FormItem><FormLabel>Back *</FormLabel><FormControl><textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <TextField name="tags" label="Tags (comma)" placeholder="e.g. chapter1, vocab" />
            <div className="grid grid-cols-2 gap-3">
              <CourseSelectField courses={courses} />
              <FormField name="noteId" render={({ field }) => (
                <FormItem><FormLabel>Note</FormLabel><FormControl><Select {...field}><option value="">No note</option>{notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}</Select></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
