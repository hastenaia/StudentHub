"use client";

import * as React from "react";
import { Search, Plus, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CourseFilterSelect } from "@/components/common/FormFields";
import { FlashcardCard } from "@/components/study/FlashcardCard";
import { FlashcardDialog } from "@/components/study/FlashcardDialog";
import { FlashcardStudy } from "@/components/study/FlashcardStudy";
import { useToast } from "@/hooks/useToast";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import {
  buildFlashcardSearchIndex,
  EMPTY_FLASHCARD_FILTERS,
  filterFlashcards,
  knownPercent,
  studyDeck,
  type FlashcardFilters,
} from "@/lib/flashcardView";
import { upsertById } from "@/utils/text";
import type { Flashcard, CourseOption } from "@/types/study";

interface Props {
  initialFlashcards: Flashcard[];
  courses: CourseOption[];
  notes: { id: string; title: string }[];
}

/** null = no dialog; `card: null` = a new card. */
type Editor = { card: Flashcard | null } | null;

export function FlashcardsTab({ initialFlashcards, courses, notes }: Props) {
  const { toast } = useToast();
  const [cards, setCards] = React.useState<Flashcard[]>(initialFlashcards);
  const [filters, setFilters] = React.useState<FlashcardFilters>(EMPTY_FLASHCARD_FILTERS);
  const [editor, setEditor] = React.useState<Editor>(null);
  const [studying, setStudying] = React.useState(false);

  const searchIndex = React.useMemo(() => buildFlashcardSearchIndex(cards), [cards]);
  const deferredFilters = React.useDeferredValue(filters);
  const filtered = React.useMemo(() => filterFlashcards(cards, searchIndex, deferredFilters), [cards, searchIndex, deferredFilters]);
  const progress = React.useMemo(() => knownPercent(cards), [cards]);

  const handleDelete = async (id: string) => {
    const res = await flashcardsClientService.deleteFlashcard(id);
    if (!res.success) return toast({ title: "Failed", description: res.message, variant: "error" });
    setCards((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Deleted", variant: "success" });
  };

  const mark = async (card: Flashcard, known: boolean): Promise<boolean> => {
    const res = await flashcardsClientService.markKnown(card.id, known);
    if (!res.success) {
      toast({ title: "Failed", description: res.message, variant: "error" });
      return false;
    }
    setCards((prev) => upsertById(prev, { ...card, isKnown: known, lastReviewed: new Date().toISOString() }));
    toast({ title: res.message ?? "Saved", variant: "success" });
    return true;
  };

  const handleSaved = (card: Flashcard) => {
    setCards((prev) => upsertById(prev, card));
    setEditor(null);
  };

  if (studying) {
    return <FlashcardStudy deck={studyDeck(filtered)} progress={progress} onMark={mark} onExit={() => setStudying(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search front, back, tags…" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditor({ card: null })}>
            <Plus className="h-4 w-4" /> New Card
          </Button>
          <Button variant="outline" onClick={() => setStudying(true)} disabled={filtered.length === 0}>
            <Brain className="h-4 w-4" /> Study ({filtered.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CourseFilterSelect courses={courses} value={filters.course} onChange={(course) => setFilters({ ...filters, course })} />
        <Select value={filters.known} onChange={(e) => setFilters({ ...filters, known: e.target.value as FlashcardFilters["known"] })} aria-label="Filter by status">
          <option value="all">All</option>
          <option value="known">Known</option>
          <option value="unknown">Unknown</option>
        </Select>
        <span className="ml-auto text-xs text-gray-500">{filtered.length} cards • {progress}% known</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No flashcards yet</p>
            <Button size="sm" className="mt-3" onClick={() => setEditor({ card: null })}>
              Create first card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((card) => (
            <FlashcardCard
              key={card.id}
              card={card}
              onEdit={() => setEditor({ card })}
              onDelete={() => handleDelete(card.id)}
              onStudy={() => setStudying(true)}
            />
          ))}
        </div>
      )}

      {editor && <FlashcardDialog editing={editor.card} courses={courses} notes={notes} onClose={() => setEditor(null)} onSaved={handleSaved} />}
    </div>
  );
}
