"use client";

import * as React from "react";
import { Lightbulb, FileText, Layers, HelpCircle, Calendar, Sparkles, AlertTriangle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { notesClientService } from "@/services/notesClient.service";
import type { Note, QuestionType } from "@/types/study";

type Action = "explain" | "summarize" | "flashcards" | "quiz" | "plan";

interface Props { notes: Note[]; courses: { id: string; name: string }[] }

export function AIAssistantTab({ notes, courses }: Props) {
  const { toast } = useToast();
  const [action, setAction] = React.useState<Action>("explain");
  const [concept, setConcept] = React.useState("");
  const [selectedNote, setSelectedNote] = React.useState<string>("");
  const [selectedCourse, setSelectedCourse] = React.useState<string>("");
  const [count, setCount] = React.useState<string>("5");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [generated, setGenerated] = React.useState<unknown>(null);

  const call = async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setGenerated(null);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message ?? `Request failed (${res.status})`;
        setError(msg);
        if (res.status === 503) toast({ title: "AI not configured", description: msg, variant: "error" });
      } else {
        setGenerated(data.data);
        // Extract text for display
        const txt = data.data?.explanation ?? data.data?.summary ?? data.data?.plan ?? JSON.stringify(data.data, null, 2);
        setResult(typeof txt === "string" ? txt : JSON.stringify(data.data, null, 2));
        toast({ title: "AI response ready", variant: "success" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (action === "explain") {
      if (!concept.trim()) return setError("Please enter a concept to explain.");
      return call("/api/ai/explain", { concept, courseId: selectedCourse || undefined });
    }
    if (action === "summarize") {
      if (!selectedNote && !concept) return setError("Select a note or enter content.");
      const content = selectedNote ? undefined : concept;
      return call("/api/ai/summarize", { noteId: selectedNote || undefined, content, title: "Note" });
    }
    if (action === "flashcards") {
      const content = selectedNote ? undefined : concept;
      if (!content && !selectedNote) return setError("Select a note or paste content.");
      return call("/api/ai/generate-flashcards", { noteId: selectedNote || undefined, content, count: Number(count) || 5, courseId: selectedCourse || undefined });
    }
    if (action === "quiz") {
      const content = selectedNote ? undefined : concept;
      if (!content && !selectedNote) return setError("Select a note or paste content.");
      return call("/api/ai/generate-quiz", { noteId: selectedNote || undefined, content, count: Number(count) || 5, courseId: selectedCourse || undefined, title: "Practice Quiz" });
    }
    if (action === "plan") {
      if (!concept.trim()) return setError("Enter a topic for the study plan.");
      return call("/api/ai/study-plan", { topic: concept, courseId: selectedCourse || undefined, durationDays: Number(count) || 7 });
    }
  };

  const [saving, setSaving] = React.useState<null | "flashcards" | "quiz" | "summary">(null);

  const withSaving = async (kind: NonNullable<typeof saving>, work: () => Promise<void>) => {
    setSaving(kind);
    try {
      await work();
    } finally {
      setSaving(null);
    }
  };

  const saveFlashcards = async () => {
    const items = Array.isArray((generated as { flashcards?: unknown })?.flashcards)
      ? (generated as { flashcards: { front?: string; back?: string }[] }).flashcards
      : Array.isArray(generated)
        ? (generated as { front?: string; back?: string }[])
        : [];
    const valid = items.filter((c) => c.front?.trim() && c.back?.trim());
    if (!valid.length) return toast({ title: "Nothing to save", variant: "error" });
    await withSaving("flashcards", async () => {
      const results = await Promise.allSettled(
        valid.map((c) =>
          flashcardsClientService.createFlashcard({ front: c.front!.trim(), back: c.back!.trim(), tags: [], courseId: selectedCourse || null, noteId: selectedNote || null })
        )
      );
      const n = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
      toast({ title: `Saved ${n} flashcards`, variant: n ? "success" : "error" });
    });
  };

  const saveQuiz = async () => {
    const qs = ((generated as { questions?: unknown[] })?.questions ?? []) as { question_text?: string; question_type?: string; options?: string[]; correct_answer?: string; explanation?: string }[];
    if (!qs.length) return toast({ title: "Nothing to save", variant: "error" });
    await withSaving("quiz", async () => {
      const res = await quizzesClientService.createQuiz({
        title: "AI Quiz",
        description: null,
        courseId: selectedCourse || null,
        questions: qs
          .filter((q) => q.question_text?.trim() && q.correct_answer?.trim())
          .map((q) => ({
            questionText: q.question_text!.trim(),
            questionType: (["multiple_choice", "true_false", "short_answer"].includes(q.question_type ?? "") ? q.question_type : "short_answer") as QuestionType,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correct_answer!.trim(),
            explanation: q.explanation ?? null,
          })),
      });
      toast({ title: res.success ? "Quiz saved" : "Save failed", description: res.success ? undefined : res.message, variant: res.success ? "success" : "error" });
    });
  };

  const saveSummary = async () => {
    if (!result) return;
    await withSaving("summary", async () => {
      const title = selectedNote ? `Summary: ${notes.find((n) => n.id === selectedNote)?.title ?? "Note"}` : "AI Summary";
      const res = await notesClientService.createNote({ title, content: result, tags: ["ai-summary"], courseId: selectedCourse || null });
      toast({ title: res.success ? "Summary saved as new note" : "Save failed", description: res.success ? undefined : res.message, variant: res.success ? "success" : "error" });
    });
  };

  const isConfigError = error?.includes("not configured");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-600" /> AI Study Assistant
          </CardTitle>
          <p className="text-xs text-gray-500">Server-side AI — keys never exposed to the browser. Real responses only; shows configuration error if not set up.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { id: "explain" as Action, label: "Explain concept", icon: Lightbulb },
              { id: "summarize" as Action, label: "Summarize notes", icon: FileText },
              { id: "flashcards" as Action, label: "Generate flashcards", icon: Layers },
              { id: "quiz" as Action, label: "Generate practice quiz", icon: HelpCircle },
              { id: "plan" as Action, label: "Create study plan", icon: Calendar },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => { setAction(a.id); setResult(null); setError(null); }}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium ${action === a.id ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <a.icon className="h-5 w-5" />
                {a.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 bg-brand-gray/20 p-4">
            {action === "explain" && (
              <>
                <label className="text-xs font-medium text-gray-700">Concept to explain *</label>
                <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g. Photosynthesis, Bayes theorem" />
                <label className="text-xs font-medium text-gray-700">Course (optional)</label>
                <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </>
            )}
            {action === "summarize" && (
              <>
                <label className="text-xs font-medium text-gray-700">Select note to summarize</label>
                <Select value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)}>
                  <option value="">— pick a note —</option>
                  {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </Select>
                <p className="text-xs text-gray-400">Or paste content below (if no note selected)</p>
                <textarea rows={3} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Paste note content to summarize…" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </>
            )}
            {(action === "flashcards" || action === "quiz") && (
              <>
                <label className="text-xs font-medium text-gray-700">Source note</label>
                <Select value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)}>
                  <option value="">— pick a note —</option>
                  {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </Select>
                <textarea rows={3} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Or paste content here…" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium">Count</label>
                  <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(e.target.value)} className="w-20" />
                  <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                    <option value="">No course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
              </>
            )}
            {action === "plan" && (
              <>
                <label className="text-xs font-medium">Topic *</label>
                <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g. Final exam revision, Chapter 1-3" />
                <div className="flex gap-2">
                  <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                    <option value="">No course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Input type="number" min={1} max={30} value={count} onChange={(e) => setCount(e.target.value)} className="w-24" placeholder="Days" />
                </div>
              </>
            )}

            <Button onClick={handleAction} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading
                ? "Thinking…"
                : action === "explain"
                ? "Explain"
                : action === "summarize"
                ? "Summarize"
                : action === "flashcards"
                ? "Generate flashcards"
                : action === "quiz"
                ? "Generate quiz"
                : "Create plan"}
            </Button>
          </div>

          {isConfigError && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">AI not configured</p>
                <p className="text-xs">{error}</p>
                <p className="mt-1 text-xs">Add <code>OPENAI_API_KEY</code> (or <code>AI_API_KEY</code>) to <code>.env.local</code> and restart. See <code>.env.local.example</code>. Keys are server-only.</p>
              </div>
            </div>
          )}

          {error && !isConfigError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" /> AI Result
                </div>
                <div className="whitespace-pre-wrap rounded bg-brand-gray/30 p-3 text-sm leading-relaxed text-gray-800">{result}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {action === "flashcards" && Boolean(generated) && (
                    <Button size="sm" onClick={saveFlashcards} disabled={saving !== null}>{saving === "flashcards" ? "Saving…" : "Save as flashcards"}</Button>
                  )}
                  {action === "quiz" && Boolean(generated) && (
                    <Button size="sm" onClick={saveQuiz} disabled={saving !== null}>{saving === "quiz" ? "Saving…" : "Save as quiz"}</Button>
                  )}
                  {action === "summarize" && result && (
                    <Button size="sm" onClick={saveSummary} disabled={saving !== null}>{saving === "summary" ? "Saving…" : "Save as new note"}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
