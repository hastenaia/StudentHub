"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CourseSelectField, TextField } from "@/components/common/FormFields";
import { MarkdownPreview } from "@/components/study/MarkdownPreview";
import { useToast } from "@/hooks/useToast";
import { useNoteAttachments } from "@/hooks/useNoteAttachments";
import { notesClientService } from "@/services/notesClient.service";
import { noteSchema, type NoteFormValues } from "@/lib/validations/study";
import { appendAttachmentLink, noteToFormValues, stripAttachmentLink, toNoteDraft, wrapSelection, type DialogPdf } from "@/lib/notesForm";
import { MAX_CATEGORY_LENGTH } from "@/lib/noteCategories";
import type { CourseOption, Note } from "@/types/study";

interface Props {
  /** null = new note. */
  note: Note | null;
  defaultCategory: string | null;
  categories: string[];
  courses: CourseOption[];
  onSaved: (note: Note) => void;
  onClose: () => void;
}

export function NoteEditorDialog({ note, defaultCategory, categories, courses, onSaved, onClose }: Props) {
  const { toast } = useToast();
  const pdfs = useNoteAttachments(note?.id ?? null);
  const form = useForm<NoteFormValues>({ resolver: zodResolver(noteSchema), defaultValues: noteToFormValues(note, defaultCategory) });
  const content = useWatch({ control: form.control, name: "content" }) ?? "";
  const setContent = (next: string) => form.setValue("content", next, { shouldDirty: true });

  const onSubmit = async (values: NoteFormValues) => {
    const draft = toNoteDraft(values);
    const res = note ? await notesClientService.updateNote(note.id, draft) : await notesClientService.createNote(draft);
    if (!res.success || !res.data) return toast({ title: "Failed", description: res.message, variant: "error" });
    const attached = await pdfs.commit(res.data.id, draft.content ?? "");
    if (!attached.success) toast({ title: "Attachments not fully saved", description: attached.message, variant: "error" });
    onSaved(withCourse(res.data, courses));
    toast({ title: note ? "Note updated" : "Note created", variant: "success" });
  };

  const attachPdf = async (file: File | undefined) => {
    if (!file) return;
    const res = await pdfs.attach(file);
    if (!res.success || !res.data) return toast({ title: res.message ?? "Upload failed", variant: "error" });
    setContent(appendAttachmentLink(form.getValues("content") ?? "", file.name, res.data.path));
    toast({ title: res.message ?? "PDF attached", variant: "success" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={note ? "Edit note" : "New note"} className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{note ? "Edit note" : "New note"}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <TextField name="title" label="Title *" />
            <FormField name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Content (Markdown supported)</FormLabel>
                <MarkdownToolbar form={form} />
                <FormControl><textarea rows={8} placeholder="Write in Markdown: # Heading, **bold**, *italic*, - list, [link](url), `code`" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {content && (
              <div className="rounded border bg-brand-gray/20 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">Preview</p>
                <MarkdownPreview content={pdfs.resolve(content)} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-700">
                Attach PDF (max 10MB)
                <input type="file" accept="application/pdf" className="mt-1 block text-xs" onChange={(e) => attachPdf(e.target.files?.[0])} />
              </label>
              <NoteAttachmentList items={pdfs.linked(content)} onRemove={(path) => setContent(stripAttachmentLink(content, path))} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CourseSelectField courses={courses} />
              <TextField name="tags" label="Tags (comma separated)" placeholder="e.g. biology, exam" />
            </div>
            <FormField name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl><Input list="note-categories" maxLength={MAX_CATEGORY_LENGTH} placeholder="e.g. Week 3, Midterm review" {...field} /></FormControl>
                <datalist id="note-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="favorite" render={({ field }) => (
              <FormItem className="flex items-center gap-2"><FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" /></FormControl><FormLabel className="!m-0">Favorite</FormLabel></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>{note ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

/** The client service can't resolve course names; fill them from the page's courses. */
function withCourse(note: Note, courses: CourseOption[]): Note {
  const course = courses.find((c) => c.id === note.courseId);
  return { ...note, courseName: course?.name ?? null, courseColor: course?.color ?? null };
}

function MarkdownToolbar({ form }: { form: UseFormReturn<NoteFormValues> }) {
  const edit = (fn: (cur: string) => string) => form.setValue("content", fn(form.getValues("content") ?? ""), { shouldDirty: true });
  const selection = () => document.querySelector<HTMLTextAreaElement>("textarea[name=content]");

  return (
    <div className="mb-1 flex gap-1">
      <Button type="button" variant="outline" size="sm" onClick={() => edit((cur) => wrapSelection(cur, selection(), "**", "**"))}>B</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => edit((cur) => "# " + cur)}>H1</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => edit((cur) => cur + "`code`")}>{"</>"}</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => edit((cur) => cur + "\n- item")}>• List</Button>
    </div>
  );
}

function NoteAttachmentList({ items, onRemove }: { items: DialogPdf[]; onRemove: (path: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 space-y-1">
      {items.map((a) => (
        <div key={a.path} className="flex items-center gap-2">
          {a.url ? (
            <a href={a.url} target="_blank" rel="noopener" className="text-xs text-brand-royal underline">{a.name}</a>
          ) : (
            <span className="text-xs text-gray-700">{a.name}</span>
          )}
          {!a.path.startsWith("http") && (
            <button type="button" aria-label={`Remove ${a.name}`} onClick={() => onRemove(a.path)} className="text-gray-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <p className="text-[11px] text-gray-500">Removed PDFs are deleted when you save.</p>
    </div>
  );
}
