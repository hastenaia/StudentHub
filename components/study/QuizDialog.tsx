"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CourseSelectField, TextField } from "@/components/common/FormFields";
import { useToast } from "@/hooks/useToast";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { quizSchema, type QuizFormValues } from "@/lib/validations/study";
import { EMPTY_QUIZ_FORM, EMPTY_QUIZ_QUESTION, quizFormToDraft } from "@/lib/quizView";
import type { CourseOption, Quiz } from "@/types/study";

interface Props {
  courses: CourseOption[];
  onClose: () => void;
  onCreated: (quiz: Quiz) => void;
}

export function QuizDialog({ courses, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const form = useForm<QuizFormValues>({ resolver: zodResolver(quizSchema) as never, defaultValues: EMPTY_QUIZ_FORM });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  const onSubmit = async (values: QuizFormValues) => {
    const res = await quizzesClientService.createQuiz(quizFormToDraft(values));
    if (!res.success || !res.data) return toast({ title: "Failed", description: res.message, variant: "error" });
    // The client service can't resolve course names; fill them from the page's courses.
    onCreated({ ...res.data, courseName: courses.find((c) => c.id === res.data!.courseId)?.name ?? null });
    toast({ title: "Quiz created", variant: "success" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label="New Quiz" className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">New Quiz</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <TextField name="title" label="Title *" />
            <TextField name="description" label="Description" />
            <CourseSelectField courses={courses} />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Questions</p>
                <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_QUIZ_QUESTION)}>
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>
              {fields.map((field, idx) => (
                <QuestionFields key={field.id} control={form.control} index={idx} onRemove={fields.length > 1 ? () => remove(idx) : undefined} />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>Create Quiz</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

/** One question's fields; `onRemove` is omitted for the last remaining question. */
function QuestionFields({ control, index, onRemove }: { control: Control<QuizFormValues>; index: number; onRemove?: () => void }) {
  const type = useWatch({ control, name: `questions.${index}.questionType` });
  const multipleChoice = type === "multiple_choice";
  const prefix = `questions.${index}`;

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Q{index + 1}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={!onRemove} aria-label={`Remove question ${index + 1}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <TextField name={`${prefix}.questionText`} label="Question *" />
        <FormField name={`${prefix}.questionType`} render={({ field }) => (
          <FormItem><FormLabel>Type</FormLabel><FormControl><Select {...field}><option value="multiple_choice">Multiple Choice</option><option value="true_false">True/False</option><option value="short_answer">Short Answer</option></Select></FormControl><FormMessage /></FormItem>
        )} />
        {multipleChoice && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((optIdx) => (
              <TextField key={optIdx} name={`${prefix}.options.${optIdx}`} label={`Option ${optIdx + 1}`} />
            ))}
          </div>
        )}
        <TextField name={`${prefix}.correctAnswer`} label="Correct answer *" placeholder={multipleChoice ? "Must match one option" : "Answer"} />
        <TextField name={`${prefix}.explanation`} label="Explanation (shown on review)" />
      </CardContent>
    </Card>
  );
}
