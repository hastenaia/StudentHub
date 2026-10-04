"use client";

import * as React from "react";
import { Search, Plus, Trash2, Play, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseFilterSelect } from "@/components/common/FormFields";
import { QuizDialog } from "@/components/study/QuizDialog";
import { QuizPlayer } from "@/components/study/QuizPlayer";
import { QuizReview } from "@/components/study/QuizReview";
import { useToast } from "@/hooks/useToast";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { filterQuizzes, gradeQuiz, type QuizResult } from "@/lib/quizView";
import type { CourseOption, Quiz } from "@/types/study";

/** `quizzes`/`setQuizzes` are owned by StudyHubView so an AI-tab save shows up here. */
interface Props { quizzes: Quiz[]; setQuizzes: React.Dispatch<React.SetStateAction<Quiz[]>>; courses: CourseOption[] }

export function QuizzesTab({ quizzes, setQuizzes, courses }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [filterCourse, setFilterCourse] = React.useState<string>("all");
  const [creating, setCreating] = React.useState(false);
  const [taking, setTaking] = React.useState<Quiz | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<QuizResult | null>(null);

  const filtered = React.useMemo(() => filterQuizzes(quizzes, search, filterCourse), [quizzes, search, filterCourse]);

  const handleDelete = async (id: string) => {
    const res = await quizzesClientService.deleteQuiz(id);
    if (!res.success) return toast({ title: "Failed", description: res.message, variant: "error" });
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    toast({ title: "Quiz deleted", variant: "success" });
  };

  /** Starts (or retries) an attempt at `quiz`. */
  const startQuiz = (quiz: Quiz | null) => {
    setTaking(quiz);
    setAnswers({});
    setResult(null);
  };

  const submitQuiz = async (quiz: Quiz) => {
    const graded = gradeQuiz(quiz.questions, answers);
    const submitted = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
    const res = await quizzesClientService.submitAttempt(quiz.id, submitted, graded.score, graded.total);
    if (!res.success) toast({ title: "Failed to save attempt", description: res.message, variant: "error" });
    setResult(graded);
  };

  const handleCreated = (quiz: Quiz) => {
    setQuizzes((prev) => [quiz, ...prev]);
    setCreating(false);
  };

  if (taking && result) {
    return <QuizReview title={taking.title} result={result} onBack={() => startQuiz(null)} onRetry={() => startQuiz(taking)} />;
  }
  if (taking) {
    return (
      <QuizPlayer
        quiz={taking}
        answers={answers}
        onAnswer={(questionId, answer) => setAnswers((prev) => ({ ...prev, [questionId]: answer }))}
        onSubmit={() => submitQuiz(taking)}
        onClose={() => startQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search quizzes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New Quiz
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <CourseFilterSelect courses={courses} value={filterCourse} onChange={setFilterCourse} />
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
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onStart={() => startQuiz(quiz)} onDelete={() => handleDelete(quiz.id)} />
          ))}
        </div>
      )}

      {creating && <QuizDialog courses={courses} onClose={() => setCreating(false)} onCreated={handleCreated} />}
    </div>
  );
}

export function QuizCard({ quiz, onStart, onDelete }: { quiz: Quiz; onStart: () => void; onDelete: () => void }) {
  return (
    <Card className="flex flex-col">
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
          <Button size="sm" onClick={onStart} className="flex-1">
            <Play className="h-4 w-4" /> Start
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={onDelete} aria-label={`Delete ${quiz.title}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
