"use client";

import * as React from "react";
import { Search, Plus, Trash2, Play, BookOpen, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/useToast";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { quizSchema, type QuizFormValues } from "@/lib/validations/study";
import type { CourseOption, Quiz, QuizQuestion } from "@/types/study";

interface Props { initialQuizzes: Quiz[]; courses: CourseOption[] }

export function QuizzesTab({ initialQuizzes, courses }: Props) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = React.useState<Quiz[]>(initialQuizzes);
  const [search, setSearch] = React.useState("");
  const [filterCourse, setFilterCourse] = React.useState<string>("all");
  const [open, setOpen] = React.useState(false);
  const [taking, setTaking] = React.useState<Quiz | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ score: number; total: number; review: { q: QuizQuestion; userAnswer: string; correct: boolean }[] } | null>(null);

  const filtered = React.useMemo(() => {
    let r = [...quizzes];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((quiz) => [quiz.title, quiz.description ?? ""].join(" ").toLowerCase().includes(q));
    }
    if (filterCourse !== "all") r = r.filter((q) => q.courseId === filterCourse);
    return r;
  }, [quizzes, search, filterCourse]);

  const handleDelete = async (id: string) => {
    const res = await quizzesClientService.deleteQuiz(id);
    if (res.success) { setQuizzes((prev) => prev.filter((q) => q.id !== id)); toast({ title: "Quiz deleted", variant: "success" }); }
    else toast({ title: "Failed", description: res.message, variant: "error" });
  };

  const startQuiz = (quiz: Quiz) => {
    setTaking(quiz);
    setAnswers({});
    setResult(null);
  };

  const submitQuiz = async () => {
    if (!taking) return;
    let score = 0;
    const review: { q: QuizQuestion; userAnswer: string; correct: boolean }[] = [];
    for (const q of taking.questions) {
      const ua = (answers[q.id] ?? "").trim();
      const correct = ua.toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (correct) score++;
      review.push({ q, userAnswer: ua, correct });
    }
    const res = await quizzesClientService.submitAttempt(taking.id, Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })), score, taking.questions.length);
    if (!res.success) toast({ title: "Failed to save attempt", description: res.message, variant: "error" });
    setResult({ score, total: taking.questions.length, review });
  };

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema) as never,
    defaultValues: { title: "", description: "", courseId: "", questions: [{ questionText: "", questionType: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", explanation: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  const onCreate = async (values: QuizFormValues) => {
    const normalized = {
      ...values,
      questions: values.questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType as Quiz["questions"][number]["questionType"],
        options: q.questionType === "multiple_choice" ? q.options.filter(Boolean) : [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
      })),
    };
    const res = await quizzesClientService.createQuiz(normalized as never);
    if (res.success) {
      toast({ title: "Quiz created", variant: "success" });
      setOpen(false);
      form.reset();
      // Optimistically add
      setQuizzes((prev) => [{ id: Math.random().toString(), title: values.title, description: values.description || null, courseId: values.courseId || null, courseName: courses.find((c) => c.id === values.courseId)?.name ?? null, questions: normalized.questions.map((q, i) => ({ id: `tmp-${i}`, questionText: q.questionText, questionType: q.questionType as never, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, position: i })), createdAt: new Date().toISOString() }, ...prev]);
    } else toast({ title: "Failed", description: res.message, variant: "error" });
  };

  if (taking) {
    if (result) {
      const incorrect = result.review.filter((r) => !r.correct);
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setTaking(null); setResult(null); }}>
              <RotateCcw className="h-4 w-4" /> Back
            </Button>
            <span className="text-sm font-medium">Score: {result.score} / {result.total}</span>
          </div>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold">{taking.title} — Review</h3>
              <p className="text-sm text-gray-500">
                {result.score === result.total ? "Perfect! You got all correct." : `${incorrect.length} incorrect — review below.`}
              </p>
            </CardContent>
          </Card>
          {result.review.map(({ q, userAnswer, correct }) => (
            <Card key={q.id} className={correct ? "border-emerald-200" : "border-red-200"}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">{q.questionText}</p>
                <p className="mt-1 text-xs text-gray-500">{q.questionType.replace("_", " ")} {q.options?.length ? `• Options: ${q.options.join(", ")}` : ""}</p>
                <div className="mt-2 flex items-center gap-2">
                  {correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  <span className={`text-sm ${correct ? "text-emerald-700" : "text-red-700"}`}>Your answer: {userAnswer || "(empty)"}</span>
                </div>
                {!correct && <p className="mt-1 text-sm text-gray-700">Correct: <span className="font-medium">{q.correctAnswer}</span></p>}
                {q.explanation && <p className="mt-2 rounded bg-brand-gray p-2 text-xs text-gray-600">Explanation: {q.explanation}</p>}
              </CardContent>
            </Card>
          ))}
          <Button onClick={() => { setAnswers({}); setResult(null); }}>Retry Quiz</Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-brand-dark">{taking.title}</h3>
          <Button variant="ghost" size="sm" onClick={() => setTaking(null)}>
            <XCircle className="h-4 w-4" /> Close
          </Button>
        </div>
        {taking.description && <p className="text-sm text-gray-500">{taking.description}</p>}
        <div className="space-y-3">
          {taking.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {idx + 1}. {q.questionText}
                </p>
                <p className="text-xs text-gray-400">{q.questionType.replace("_", " ")}</p>
                <div className="mt-2">
                  {q.questionType === "multiple_choice" && q.options && (
                    <div className="space-y-1">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-brand-gray/20">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.questionType === "true_false" && (
                    <div className="flex gap-2">
                      {["True", "False"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                          <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.questionType === "short_answer" && (
                    <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} placeholder="Your answer" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={submitQuiz} className="w-full">
          Submit Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search quizzes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Quiz
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-gray-500">{filtered.length} quizzes</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No quizzes yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-base">{quiz.title}</CardTitle>
                {quiz.description && <p className="truncate text-xs text-gray-500">{quiz.description}</p>}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {quiz.questions.length} questions
                  </span>
                  {quiz.courseName && <span className="rounded bg-brand-gray px-1.5 py-0.5">{quiz.courseName}</span>}
                  <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" onClick={() => startQuiz(quiz)} className="flex-1">
                    <Play className="h-4 w-4" /> Start
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(quiz.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">New Quiz</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate as never)} className="mt-4 space-y-4" noValidate>
                <FormField name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="courseId" render={({ field }) => (
                  <FormItem><FormLabel>Course</FormLabel><FormControl><Select {...field}><option value="">No course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormControl><FormMessage /></FormItem>
                )} />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Questions</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ questionText: "", questionType: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", explanation: "" })}>
                      <Plus className="h-4 w-4" /> Add Question
                    </Button>
                  </div>
                  {fields.map((field, idx) => (
                    <Card key={field.id} className="border-dashed">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Q{idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)} disabled={fields.length === 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormField name={`questions.${idx}.questionText`} render={({ field }) => (
                          <FormItem><FormLabel>Question *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name={`questions.${idx}.questionType`} render={({ field }) => (
                          <FormItem><FormLabel>Type</FormLabel><FormControl><Select {...field}><option value="multiple_choice">Multiple Choice</option><option value="true_false">True/False</option><option value="short_answer">Short Answer</option></Select></FormControl><FormMessage /></FormItem>
                        )} />
                        {form.watch(`questions.${idx}.questionType`) === "multiple_choice" && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {[0, 1, 2, 3].map((optIdx) => (
                              <FormField key={optIdx} name={`questions.${idx}.options.${optIdx}`} render={({ field }) => (
                                <FormItem><FormLabel>Option {optIdx + 1}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            ))}
                          </div>
                        )}
                        <FormField name={`questions.${idx}.correctAnswer`} render={({ field }) => (
                          <FormItem><FormLabel>Correct answer *</FormLabel><FormControl><Input placeholder={form.watch(`questions.${idx}.questionType`) === "multiple_choice" ? "Must match one option" : "Answer"} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name={`questions.${idx}.explanation`} render={({ field }) => (
                          <FormItem><FormLabel>Explanation (shown on review)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" isLoading={form.formState.isSubmitting}>Create Quiz</Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
