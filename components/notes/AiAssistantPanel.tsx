"use client";
import * as React from "react";
import { Sparkles, FileText, Layers, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockAiSummary, mockFlashcards, mockQuiz } from "@/lib/mocks/notes";

export function AiAssistantPanel() {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [showCards, setShowCards] = React.useState(false);
  const [flip, setFlip] = React.useState<number | null>(null);
  const [quizIdx, setQuizIdx] = React.useState(0);
  const [score, setScore] = React.useState<number | null>(null);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [showQuiz, setShowQuiz] = React.useState(false);

  const startQuiz = () => { setShowQuiz(true); setQuizIdx(0); setScore(0); setPicked(null); };

  const answerQuiz = (opt: number) => {
    setPicked(opt);
    const correct = mockQuiz[quizIdx].answer;
    const isCorrect = opt === correct;
    setTimeout(() => {
      const nextScore = (score ?? 0) + (isCorrect ? 1 : 0);
      setScore(nextScore);
      if (quizIdx + 1 < mockQuiz.length) { setQuizIdx((i) => i + 1); setPicked(null); }
      else {
        // done
      }
    }, 600);
  };

  return (
    <Card className="border-brand-royal/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-royal" /> AI Study Assistant</CardTitle>
        <CardDescription>Virtual Engine — summaries, flashcards, quizzes (mock AI).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => setSummary(mockAiSummary)}><FileText className="h-4 w-4" /> Summarize</Button>
          <Button variant="outline" onClick={() => setShowCards((v) => !v)}><Layers className="h-4 w-4" /> Flashcards</Button>
          <Button variant="outline" onClick={startQuiz}><HelpCircle className="h-4 w-4" /> Quiz</Button>
        </div>
        {summary && (
          <div className="rounded-md border border-gray-200 bg-brand-gray/40 p-3 text-sm text-brand-dark">
            <p className="mb-1 text-xs font-semibold text-brand-royal">One-click summary</p>
            <p>{summary}</p>
          </div>
        )}
        {showCards && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Flashcards — click to flip</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {mockFlashcards.map((c, i) => (
                <button key={i} onClick={() => setFlip(flip === i ? null : i)} className="rounded-md border border-gray-200 bg-white p-3 text-left text-sm hover:border-brand-royal">
                  <p className="font-medium text-brand-dark">{flip === i ? c.a : c.q}</p>
                  <p className="mt-1 text-xs text-gray-400">{flip === i ? "— answer (click to hide)" : "— question (click to reveal)"}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {showQuiz && (
          <div className="rounded-md border border-gray-200 bg-white p-3">
            {quizIdx < mockQuiz.length ? (
              <>
                <p className="text-sm font-medium text-brand-dark">Q{quizIdx + 1}. {mockQuiz[quizIdx].q}</p>
                <div className="mt-2 grid gap-2">
                  {mockQuiz[quizIdx].options.map((o, i) => {
                    const isPicked = picked === i;
                    const isCorrect = i === mockQuiz[quizIdx].answer;
                    const show = picked !== null;
                    return (
                      <button key={i} onClick={() => picked === null && answerQuiz(i)} disabled={picked !== null}
                        className={`rounded-md border px-3 py-2 text-left text-sm ${show && isCorrect ? "border-emerald-300 bg-emerald-50" : show && isPicked && !isCorrect ? "border-red-300 bg-red-50" : "border-gray-200 hover:bg-brand-gray/40"}`}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">Score: {score ?? 0}/{mockQuiz.length}</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-brand-dark">Quiz complete!</p>
                <p className="text-sm text-gray-600">You scored {score}/{mockQuiz.length}</p>
                <Button size="sm" className="mt-2" onClick={startQuiz}>Retry</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
