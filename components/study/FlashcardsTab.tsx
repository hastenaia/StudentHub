"use client";

import * as React from "react";
import { Search, Plus, Pencil, Trash2, RotateCcw, Check, X, BookOpen, Brain } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/useToast";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import { flashcardSchema, type FlashcardFormValues } from "@/lib/validations/study";
import type { Flashcard, CourseOption } from "@/types/study";

interface Props {
  initialFlashcards: Flashcard[];
  courses: CourseOption[];
  notes: { id: string; title: string }[];
}

export function FlashcardsTab({ initialFlashcards, courses, notes }: Props) {
  const { toast } = useToast();
  const [cards, setCards] = React.useState<Flashcard[]>(initialFlashcards);
  const [search, setSearch] = React.useState("");
  const [filterCourse, setFilterCourse] = React.useState<string>("all");
  const [filterKnown, setFilterKnown] = React.useState<string>("all");
  const [editing, setEditing] = React.useState<Flashcard | null>(null);
  const [open, setOpen] = React.useState(false);
  const [studyMode, setStudyMode] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  const filtered = React.useMemo(() => {
    let r = [...cards];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((c) => [c.front, c.back, c.tags.join(" ")].join(" ").toLowerCase().includes(q));
    }
    if (filterCourse !== "all") r = r.filter((c) => c.courseId === filterCourse);
    if (filterKnown === "known") r = r.filter((c) => c.isKnown);
    if (filterKnown === "unknown") r = r.filter((c) => !c.isKnown);
    return r;
  }, [cards, search, filterCourse, filterKnown]);

  const studyDeck = React.useMemo(() => {
    const unknown = filtered.filter((c) => !c.isKnown);
    return unknown.length > 0 ? unknown : filtered;
  }, [filtered]);

  const current = studyDeck[currentIdx] ?? null;
  const progress = cards.length ? Math.round((cards.filter((c) => c.isKnown).length / cards.length) * 100) : 0;

  const handleDelete = async (id: string) => {
    const res = await flashcardsClientService.deleteFlashcard(id);
    if (res.success) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Deleted", variant: "success" });
    } else toast({ title: "Failed", description: res.message, variant: "error" });
  };

  const mark = async (known: boolean) => {
    if (!current) return;
    const res = await flashcardsClientService.markKnown(current.id, known);
    if (res.success) {
      setCards((prev) => prev.map((c) => (c.id === current.id ? { ...c, isKnown: known, lastReviewed: new Date().toISOString() } : c)));
      setFlipped(false);
      setCurrentIdx((i) => (i + 1 < studyDeck.length ? i + 1 : 0));
      toast({ title: known ? "Marked as known" : "Marked as unknown", variant: "success" });
    } else toast({ title: "Failed", description: res.message, variant: "error" });
  };

  if (studyMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setStudyMode(false)}>
            <X className="h-4 w-4" /> Exit Study
          </Button>
          <span className="text-sm text-gray-500">
            {studyDeck.length ? `${currentIdx + 1} / ${studyDeck.length}` : "No cards"} • {progress}% known
          </span>
        </div>
        {current ? (
          <Card className="mx-auto max-w-xl">
            <CardContent className="p-0">
              <div onClick={() => setFlipped((v) => !v)} className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center p-8 text-center transition">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{flipped ? "Back" : "Front"}</p>
                <p className="mt-3 text-lg font-medium text-brand-dark">{flipped ? current.back : current.front}</p>
                <p className="mt-4 text-xs text-gray-400">Click to flip • {current.tags.join(", ")}</p>
              </div>
              <div className="flex gap-2 border-t p-3">
                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => mark(false)}>
                  <X className="h-4 w-4" /> Unknown
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => mark(true)}>
                  <Check className="h-4 w-4" /> Known
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No cards to study</p>
            </CardContent>
          </Card>
        )}
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-brand-royal transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search front, back, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Card
          </Button>
          <Button variant="outline" onClick={() => { setCurrentIdx(0); setFlipped(false); setStudyMode(true); }} disabled={filtered.length === 0}>
            <Brain className="h-4 w-4" /> Study ({filtered.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={filterKnown} onChange={(e) => setFilterKnown(e.target.value)}>
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
            <Button size="sm" className="mt-3" onClick={() => { setEditing(null); setOpen(true); }}>
              Create first card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((card) => (
            <Card key={card.id} className={card.isKnown ? "border-emerald-200 bg-emerald-50/30" : ""}>
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
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${card.isKnown ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {card.isKnown ? "Known" : "Unknown"}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(card); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(card.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setStudyMode(true)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <FlashcardDialog
          editing={editing}
          courses={courses}
          notes={notes}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSuccess={(newCard, isEdit) => {
            if (isEdit && editing) setCards((prev) => prev.map((c) => (c.id === editing.id ? ({ ...c, ...newCard } as Flashcard) : c)));
            else if (newCard.id) setCards((prev) => [newCard as Flashcard, ...prev]);
            toast({ title: isEdit ? "Flashcard updated" : "Flashcard created", variant: "success" });
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function FlashcardDialog({
  editing,
  courses,
  notes,
  onClose,
  onSuccess,
}: {
  editing: Flashcard | null;
  courses: CourseOption[];
  notes: { id: string; title: string }[];
  onClose: () => void;
  onSuccess: (card: Flashcard, isEdit: boolean) => void;
}) {
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: editing
      ? { front: editing.front, back: editing.back, tags: editing.tags.join(", "), courseId: editing.courseId ?? "", noteId: editing.noteId ?? "" }
      : { front: "", back: "", tags: "", courseId: "", noteId: "" },
  });

  const onSubmit = async (values: FlashcardFormValues) => {
    const draft = {
      front: values.front,
      back: values.back,
      tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) : [],
      courseId: values.courseId || null,
      noteId: values.noteId || null,
    };
    const res = editing ? await flashcardsClientService.updateFlashcard(editing.id, draft) : await flashcardsClientService.createFlashcard(draft);
    if (res.success) {
      const data = res.data as unknown as Flashcard;
      const fallback: Flashcard = {
        id: Math.random().toString(),
        front: draft.front,
        back: draft.back,
        tags: draft.tags,
        courseId: draft.courseId,
        courseName: null,
        noteId: draft.noteId,
        isKnown: false,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewed: null,
        createdAt: new Date().toISOString(),
      };
      onSuccess(data?.id ? data : fallback, !!editing);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{editing ? "Edit flashcard" : "New flashcard"}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <FormField name="front" render={({ field }) => (
              <FormItem><FormLabel>Front *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="back" render={({ field }) => (
              <FormItem><FormLabel>Back *</FormLabel><FormControl><textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="tags" render={({ field }) => (
              <FormItem><FormLabel>Tags (comma)</FormLabel><FormControl><Input placeholder="e.g. chapter1, vocab" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField name="courseId" render={({ field }) => (
                <FormItem><FormLabel>Course</FormLabel><FormControl><Select {...field}><option value="">No course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="noteId" render={({ field }) => (
                <FormItem><FormLabel>Note</FormLabel><FormControl><Select {...field}><option value="">No note</option>{notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}</Select></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
