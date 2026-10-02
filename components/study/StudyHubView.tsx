"use client";

import * as React from "react";
import { BookOpen, Layers, HelpCircle, Sparkles } from "lucide-react";
import type { Note, Flashcard, Quiz, CourseOption, AICachedResult } from "@/types/study";
import { upsertById } from "@/utils/text";
import { NotesTab } from "@/components/study/NotesTab";
import { FlashcardsTab } from "@/components/study/FlashcardsTab";
import { QuizzesTab } from "@/components/study/QuizzesTab";
import { AIAssistantTab } from "@/components/study/AIAssistantTab";

type Tab = "notes" | "flashcards" | "quizzes" | "ai";

interface Props {
  initialNotes: Note[];
  initialFlashcards: Flashcard[];
  initialQuizzes: Quiz[];
  cachedResults: AICachedResult[];
  courses: CourseOption[];
}

/**
 * Owns all three lists so a save made in one tab is visible in the others without a reload:
 * the tabs are controlled, so `router.refresh()` alone would not help (React keeps a mounted
 * component's state and ignores fresh props).
 */
export function StudyHubView({ initialNotes, initialFlashcards, initialQuizzes, cachedResults, courses }: Props) {
  const [tab, setTab] = React.useState<Tab>("notes");
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [flashcards, setFlashcards] = React.useState<Flashcard[]>(initialFlashcards);
  const [quizzes, setQuizzes] = React.useState<Quiz[]>(initialQuizzes);

  // Additive handlers for the AI tab, matching each tab's own ordering (newest first).
  const addNote = React.useCallback((note: Note) => setNotes((prev) => upsertById(prev, note)), []);
  const addCards = React.useCallback((cards: Flashcard[]) => setFlashcards((prev) => cards.reduce((list, c) => upsertById(list, c), prev)), []);
  const addQuiz = React.useCallback((quiz: Quiz) => setQuizzes((prev) => [quiz, ...prev]), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5">
        {[
          { id: "notes" as Tab, label: "Notes", icon: BookOpen, count: notes.length },
          { id: "flashcards" as Tab, label: "Flashcards", icon: Layers, count: flashcards.length },
          { id: "quizzes" as Tab, label: "Quizzes", icon: HelpCircle, count: quizzes.length },
          { id: "ai" as Tab, label: "AI Assistant", icon: Sparkles, count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${tab === t.id ? "bg-brand-royal text-white shadow" : "text-gray-600 hover:bg-brand-gray"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== null && <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? "bg-white/20 text-white" : "bg-brand-gray text-gray-600"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "notes" && <NotesTab notes={notes} setNotes={setNotes} courses={courses} />}
      {tab === "flashcards" && <FlashcardsTab cards={flashcards} setCards={setFlashcards} courses={courses} notes={notes.map((n) => ({ id: n.id, title: n.title }))} />}
      {tab === "quizzes" && <QuizzesTab quizzes={quizzes} setQuizzes={setQuizzes} courses={courses} />}
      {tab === "ai" && (
        <AIAssistantTab
          notes={notes}
          courses={courses}
          cachedResults={cachedResults}
          onNoteCreated={addNote}
          onCardsCreated={addCards}
          onQuizCreated={addQuiz}
        />
      )}
    </div>
  );
}
