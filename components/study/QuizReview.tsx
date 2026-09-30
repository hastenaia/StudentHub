"use client";

import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { questionTypeLabel, type QuizResult, type QuizReviewItem } from "@/lib/quizView";

interface Props {
  title: string;
  result: QuizResult;
  onBack: () => void;
  onRetry: () => void;
}

/** Score summary plus per-question review after submitting a quiz. */
export function QuizReview({ title, result, onBack, onRetry }: Props) {
  const incorrect = result.review.filter((r) => !r.correct).length;
  const summary = incorrect === 0 ? "Perfect! You got all correct." : `${incorrect} incorrect — review below.`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <RotateCcw className="h-4 w-4" /> Back
        </Button>
        <span className="text-sm font-medium">
          Score: {result.score} / {result.total}
        </span>
      </div>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold">{title} — Review</h3>
          <p className="text-sm text-gray-500">{summary}</p>
        </CardContent>
      </Card>
      {result.review.map((item) => (
        <ReviewCard key={item.question.id} item={item} />
      ))}
      <Button onClick={onRetry}>Retry Quiz</Button>
    </div>
  );
}

const CORRECT = { border: "border-emerald-200", text: "text-emerald-700", Icon: CheckCircle2, icon: "text-emerald-600" };
const WRONG = { border: "border-red-200", text: "text-red-700", Icon: XCircle, icon: "text-red-600" };

function ReviewCard({ item: { question: q, userAnswer, correct } }: { item: QuizReviewItem }) {
  const style = correct ? CORRECT : WRONG;
  const options = q.options?.length ? `• Options: ${q.options.join(", ")}` : "";
  return (
    <Card className={style.border}>
      <CardContent className="p-4">
        <p className="text-sm font-medium">{q.questionText}</p>
        <p className="mt-1 text-xs text-gray-500">
          {questionTypeLabel(q.questionType)} {options}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <style.Icon className={`h-4 w-4 ${style.icon}`} />
          <span className={`text-sm ${style.text}`}>Your answer: {userAnswer || "(empty)"}</span>
        </div>
        {!correct && (
          <p className="mt-1 text-sm text-gray-700">
            Correct: <span className="font-medium">{q.correctAnswer}</span>
          </p>
        )}
        {q.explanation && <p className="mt-2 rounded bg-brand-gray p-2 text-xs text-gray-600">Explanation: {q.explanation}</p>}
      </CardContent>
    </Card>
  );
}
