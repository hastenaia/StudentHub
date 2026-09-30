"use client";

import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Flashcard } from "@/types/study";

interface Props {
  card: Flashcard;
  onEdit: () => void;
  onDelete: () => void;
  onStudy: () => void;
}

const KNOWN_STYLE = {
  card: "border-emerald-200 bg-emerald-50/30",
  badge: "bg-emerald-100 text-emerald-700",
  label: "Known",
};
const UNKNOWN_STYLE = { card: "", badge: "bg-amber-100 text-amber-700", label: "Unknown" };

export function FlashcardCard({ card, onEdit, onDelete, onStudy }: Props) {
  const style = card.isKnown ? KNOWN_STYLE : UNKNOWN_STYLE;
  return (
    <Card className={style.card}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-brand-dark">{card.front}</p>
            <p className="truncate text-xs text-gray-500">{card.back}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>{style.label}</span>
        </div>
        <div className="mt-3 flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${card.front}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={onDelete} aria-label={`Delete ${card.front}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onStudy} aria-label="Study">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
