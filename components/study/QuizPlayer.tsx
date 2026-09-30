"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { questionTypeLabel } from "@/lib/quizView";
import type { Quiz, QuizQuestion } from "@/types/study";

interface Props {
  quiz: Quiz;
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/** Answer sheet for one quiz attempt. */
export function QuizPlayer({ quiz, answers, onAnswer, onSubmit, onClose }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-dark">{quiz.title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XCircle className="h-4 w-4" /> Close
        </Button>
      </div>
      {quiz.description && <p className="text-sm text-gray-500">{quiz.description}</p>}
      <div className="space-y-3">
        {quiz.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <p className="text-sm font-medium">
                {idx + 1}. {q.questionText}
              </p>
              <p className="text-xs text-gray-400">{questionTypeLabel(q.questionType)}</p>
              <div className="mt-2">
                <AnswerInput question={q} value={answers[q.id] ?? ""} onChange={(answer) => onAnswer(q.id, answer)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={onSubmit} className="w-full">
        Submit Quiz
      </Button>
    </div>
  );
}

function AnswerInput({ question, value, onChange }: { question: QuizQuestion; value: string; onChange: (answer: string) => void }) {
  if (question.questionType === "short_answer") {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" aria-label={question.questionText} />;
  }
  const options = question.questionType === "true_false" ? ["True", "False"] : question.options ?? [];
  const layout = question.questionType === "true_false" ? "flex gap-2" : "space-y-1";
  return (
    <div className={layout}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-brand-gray/20">
          <input type="radio" name={question.id} value={opt} checked={value === opt} onChange={(e) => onChange(e.target.value)} />
          {opt}
        </label>
      ))}
    </div>
  );
}
