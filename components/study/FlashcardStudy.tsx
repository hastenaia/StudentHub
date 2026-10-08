"use client";

import * as React from "react";
import { Check, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { nextDeckIndex } from "@/lib/flashcardView";
import type { Flashcard } from "@/types/study";

interface Props {
  deck: Flashcard[];
  /** Known share of the whole collection, 0–100. */
  progress: number;
  /** Resolves true when the mark was saved. */
  onMark: (card: Flashcard, known: boolean) => Promise<boolean>;
  onExit: () => void;
}

/** Flip-card study session over `deck`. */
export function FlashcardStudy({ deck, progress, onMark, onExit }: Props) {
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const current = deck[index] ?? null;
  const position = deck.length ? `${index + 1} / ${deck.length}` : "No cards";

  const mark = async (card: Flashcard, known: boolean) => {
    if (!(await onMark(card, known))) return;
    setFlipped(false);
    setIndex((i) => nextDeckIndex(i, deck.length));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onExit}>
          <X className="h-4 w-4" /> Exit Study
        </Button>
        <span className="text-sm text-gray-500">
          {position} • {progress}% known
        </span>
      </div>
      {current ? <StudyCard card={current} flipped={flipped} onFlip={() => setFlipped((v) => !v)} onMark={(known) => mark(current, known)} /> : <NoCards />}
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-brand-royal transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function StudyCard({ card, flipped, onFlip, onMark }: { card: Flashcard; flipped: boolean; onFlip: () => void; onMark: (known: boolean) => void }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="p-0">
        <div onClick={onFlip} className="flex min-h-56 cursor-pointer flex-col items-center justify-center p-8 text-center transition">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{flipped ? "Back" : "Front"}</p>
          <p className="mt-3 text-lg font-medium text-brand-dark">{flipped ? card.back : card.front}</p>
          <p className="mt-4 text-xs text-gray-400">Click to flip • {card.tags.join(", ")}</p>
        </div>
        {flipped && (
          <div className="flex gap-2 border-t p-3">
            <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => onMark(false)}>
              <X className="h-4 w-4" /> Unknown
            </Button>
            <Button className="flex-1 bg-success hover:bg-success-hover" onClick={() => onMark(true)}>
              <Check className="h-4 w-4" /> Known
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoCards() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Brain className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No cards to study</p>
      </CardContent>
    </Card>
  );
}
