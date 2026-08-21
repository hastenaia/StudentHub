"use client";

import * as React from "react";
import { BookOpen, Layers, HelpCircle, Sparkles } from "lucide-react";
import type { Note, Flashcard, Quiz, CourseOption } from "@/types/study";
import { NotesTab } from "@/components/study/NotesTab";
import { FlashcardsTab } from "@/components/study/FlashcardsTab";
import { QuizzesTab } from "@/components/study/QuizzesTab";
import { AIAssistantTab } from "@/components/study/AIAssistantTab";

type Tab = "notes" | "flashcards" | "quizzes" | "ai";

interface Props {
  initialNotes: Note[];
  initialFlashcards: Flashcard[];
  initialQuizzes: Quiz[];
  courses: CourseOption[];
}

export function StudyHubView({ initialNotes, initialFlashcards, initialQuizzes, courses }: Props) {
  const [tab, setTab] = React.useState<Tab>("notes");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5">
        {[
          { id: "notes" as Tab, label: "Notes", icon: BookOpen, count: initialNotes.length },
          { id: "flashcards" as Tab, label: "Flashcards", icon: Layers, count: initialFlashcards.length },
          { id: "quizzes" as Tab, label: "Quizzes", icon: HelpCircle, count: initialQuizzes.length },
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

      {tab === "notes" && <NotesTab initialNotes={initialNotes} courses={courses} />}
      {tab === "flashcards" && <FlashcardsTab initialFlashcards={initialFlashcards} courses={courses} notes={initialNotes.map((n) => ({ id: n.id, title: n.title }))} />}
      {tab === "quizzes" && <QuizzesTab initialQuizzes={initialQuizzes} courses={courses} />}
      {tab === "ai" && <AIAssistantTab notes={initialNotes} courses={courses} />}
    </div>
  );
}
