"use client";

import * as React from "react";
import { AlertTriangle, BookOpen, Layers, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  defaultTitleFromFilename,
  validateDocumentFile,
} from "@/lib/documentText";
import type { Flashcard, Note } from "@/types/study";

type Course = { id: string; name: string };

interface Props {
  courses: Course[];
  onNoteCreated: (note: Note) => void;
  onCardsCreated: (cards: Flashcard[]) => void;
  /** Switch the hub to the tab holding the new items. */
  onImported: (tab: "notes" | "flashcards") => void;
}

const ACCEPT = ".pdf,.txt,.md,.markdown,.docx";

interface ImportResult {
  note: Note;
  flashcards: Flashcard[];
  summary: string;
  cached: boolean;
}

export function ImportTab({ courses, onNoteCreated, onCardsCreated, onImported }: Props) {
  const { notify } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [titleTouched, setTitleTouched] = React.useState(false);
  const [courseId, setCourseId] = React.useState("");
  const [makeFlashcards, setMakeFlashcards] = React.useState(true);
  const [count, setCount] = React.useState("5");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const pickFile = (next: File | null) => {
    setResult(null);
    if (!next) {
      setFile(null);
      return;
    }
    const problem = validateDocumentFile({ name: next.name, type: next.type, size: next.size });
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setError(null);
    setFile(next);
    if (!titleTouched) setTitle(defaultTitleFromFilename(next.name));
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a PDF, TXT, Markdown or DOCX file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title.trim() || defaultTitleFromFilename(file.name));
      form.set("courseId", courseId);
      form.set("makeFlashcards", String(makeFlashcards));
      form.set("count", count);
      const res = await fetch("/api/ai/from-document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message ?? `Import failed (${res.status})`;
        setError(msg);
        if (res.status === 503) notify(false, "AI not configured", msg);
        return;
      }
      const created = data.data as ImportResult;
      onNoteCreated(created.note);
      if (created.flashcards.length > 0) onCardsCreated(created.flashcards);
      setResult({ ...created, cached: data.cached === true });
      notify(
        true,
        created.flashcards.length > 0
          ? `Note + ${created.flashcards.length} flashcards created`
          : "Note created"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5 text-purple-600" /> Import file
          </CardTitle>
          <p className="text-xs text-gray-500">
            Upload a PDF, TXT, Markdown or DOCX file (up to 10MB). AI writes a notes summary
            from it — and flashcards too, unless you untick the box. The first ~6k
            characters are used, like the other AI actions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">File *</label>
            <Input
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="mt-1 cursor-pointer"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-500">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Note title</label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              placeholder="Defaults to the file name"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700">Course (optional)</label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mt-1">
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Flashcard count</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={!makeFlashcards}
                className="mt-1 w-24"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={makeFlashcards}
              onChange={(e) => setMakeFlashcards(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Also generate flashcards from this file
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={submit} disabled={loading || !file} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Reading file & generating…" : "Generate notes from file"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium text-emerald-700">
              Done{result.cached ? " (saved answer)" : ""} — “{result.note.title}” is in your
              notes{result.flashcards.length > 0 ? ` with ${result.flashcards.length} flashcards` : ""}.
            </p>
            <div className="whitespace-pre-wrap rounded bg-brand-gray/30 p-3 text-sm leading-relaxed text-gray-800">
              {result.summary}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onImported("notes")}>
                <BookOpen className="h-4 w-4" /> View note
              </Button>
              {result.flashcards.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => onImported("flashcards")}>
                  <Layers className="h-4 w-4" /> Study flashcards
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
