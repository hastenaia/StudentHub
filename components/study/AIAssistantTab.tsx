"use client";

import * as React from "react";
import { Lightbulb, FileText, Layers, HelpCircle, Calendar, Sparkles, AlertTriangle, Loader2, Check, Clock, History, Trash2, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { flashcardsClientService } from "@/services/flashcardsClient.service";
import { quizzesClientService } from "@/services/quizzesClient.service";
import { notesClientService } from "@/services/notesClient.service";
import { aiCacheClientService } from "@/services/aiCacheClient.service";
import type { AICachedResult, Flashcard, Note, Quiz } from "@/types/study";
import { aiCacheAgeLabel } from "@/lib/aiCacheView";
import {
  AI_SUBMIT_LABEL,
  aiResultText,
  buildAIRequest,
  toFlashcardPairs,
  toQuizQuestions,
  type AIAction,
  type AIFormInputs,
} from "@/lib/aiRequests";

type Course = { id: string; name: string };
interface Props {
  notes: Note[];
  courses: Course[];
  /** Stored answers for this user, newest first (server-rendered). */
  cachedResults: AICachedResult[];
  /** Report each save upward so the other Study Hub tabs show it without a reload. */
  onNoteCreated: (note: Note) => void;
  onCardsCreated: (cards: Flashcard[]) => void;
  onQuizCreated: (quiz: Quiz) => void;
}

const ACTIONS: { id: AIAction; label: string; icon: LucideIcon }[] = [
  { id: "explain", label: "Explain concept", icon: Lightbulb },
  { id: "summarize", label: "Summarize notes", icon: FileText },
  { id: "flashcards", label: "Generate flashcards", icon: Layers },
  { id: "quiz", label: "Generate practice quiz", icon: HelpCircle },
  { id: "plan", label: "Create study plan", icon: Calendar },
];

const TEXTAREA_CLASS = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

/** POSTs to an AI route and tracks loading / error / display text / raw data / cache-hit state. */
function useAIRequest() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [generated, setGenerated] = React.useState<unknown>(null);
  const [cached, setCached] = React.useState(false);
  /** Kept so Regenerate can re-send the same request with `refresh`. */
  const last = React.useRef<{ endpoint: string; body: Record<string, unknown> } | null>(null);

  const reset = () => {
    setResult(null);
    setError(null);
    setCached(false);
  };

  const run = async (
    endpoint: string,
    body: Record<string, unknown>,
    opts?: { refresh?: boolean; onStored?: () => void }
  ) => {
    setLoading(true);
    reset();
    setGenerated(null);
    if (!opts?.refresh) last.current = { endpoint, body };
    try {
      const payload = opts?.refresh ? { ...body, refresh: true } : body;
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message ?? `Request failed (${res.status})`;
        setError(msg);
        if (res.status === 503) toast({ title: "AI not configured", description: msg, variant: "error" });
        return;
      }
      setGenerated(data.data);
      setResult(aiResultText(data.data));
      setCached(data.cached === true);
      toast({ title: data.cached === true ? "Loaded saved answer" : "AI response ready", variant: "success" });
      opts?.onStored?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  /** Show an answer already in hand (from the history list) instead of calling the AI. */
  const showData = (data: unknown) => {
    setResult(aiResultText(data));
    setGenerated(data);
    setCached(true);
    setError(null);
  };

  return { loading, result, error, generated, cached, last, run, showData, reset, setError };
}

/** Stored answers for the history list; reads on demand so it stays correct after generate/delete. */
function useAiCacheHistory(initial: AICachedResult[]) {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | null>(null);

  const reload = async () => {
    const res = await aiCacheClientService.listHistory();
    if (res.success && res.data) setEntries(res.data);
  };

  const remove = async (id: string) => {
    setBusy(id);
    const res = await aiCacheClientService.deleteEntry(id);
    setBusy(null);
    if (res.success) setEntries((list) => list.filter((e) => e.id !== id));
    toast({ title: res.success ? "Saved answer deleted" : "Delete failed", description: res.success ? undefined : res.message, variant: res.success ? "success" : "error" });
  };

  const clearAll = async () => {
    setBusy("all");
    const res = await aiCacheClientService.clearAll();
    setBusy(null);
    if (res.success) setEntries([]);
    toast({ title: res.success ? "All saved answers deleted" : "Delete failed", description: res.success ? undefined : res.message, variant: res.success ? "success" : "error" });
  };

  return { entries, busy, reload, remove, clearAll };
}

type SaveKind = "flashcards" | "quiz" | "summary";

/** One-click saves of an AI result into flashcards, a quiz, or a new note. */
function useAISaves({
  generated,
  result,
  form,
  notes,
  onNoteCreated,
  onCardsCreated,
  onQuizCreated,
}: {
  generated: unknown;
  result: string | null;
  form: AIFormInputs;
  notes: Note[];
  onNoteCreated: (note: Note) => void;
  onCardsCreated: (cards: Flashcard[]) => void;
  onQuizCreated: (quiz: Quiz) => void;
}) {
  const { toast, notify } = useToast();
  const [saving, setSaving] = React.useState<SaveKind | null>(null);
  const courseId = form.courseId || null;

  const withSaving = async (kind: SaveKind, work: () => Promise<void>) => {
    setSaving(kind);
    try {
      await work();
    } finally {
      setSaving(null);
    }
  };

  const saveFlashcards = async () => {
    const cards = toFlashcardPairs(generated);
    if (!cards.length) return toast({ title: "Nothing to save", variant: "error" });
    await withSaving("flashcards", async () => {
      const results = await Promise.allSettled(
        cards.map((c) => flashcardsClientService.createFlashcard({ ...c, tags: [], courseId, noteId: form.noteId || null }))
      );
      // Keep the created rows so the Flashcards tab can show them without a reload.
      const created = results.flatMap((r) => (r.status === "fulfilled" && r.value.data ? [r.value.data] : []));
      onCardsCreated(created);
      notify(created.length > 0, `Saved ${created.length} flashcards`);
    });
  };

  const saveQuiz = async () => {
    const questions = toQuizQuestions(generated);
    if (!questions.length) return toast({ title: "Nothing to save", variant: "error" });
    await withSaving("quiz", async () => {
      const res = await quizzesClientService.createQuiz({ title: "AI Quiz", description: null, courseId, questions });
      if (res.success && res.data) onQuizCreated(res.data);
      notify(res.success, res.success ? "Quiz saved" : "Save failed", res.success ? undefined : res.message);
    });
  };

  const saveSummary = async () => {
    if (!result) return;
    await withSaving("summary", async () => {
      const title = form.noteId ? `Summary: ${notes.find((n) => n.id === form.noteId)?.title ?? "Note"}` : "AI Summary";
      const res = await notesClientService.createNote({ title, content: result, tags: ["ai-summary"], courseId });
      if (res.success && res.data) onNoteCreated(res.data);
      notify(res.success, res.success ? "Summary saved as new note" : "Save failed", res.success ? undefined : res.message);
    });
  };

  return { saving, saveFlashcards, saveQuiz, saveSummary };
}

function CourseSelect({ courses, value, onChange }: { courses: Course[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No course</option>
      {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  );
}

function NoteSelect({ notes, value, onChange }: { notes: Note[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— pick a note —</option>
      {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
    </Select>
  );
}

function ActionPicker({ action, onPick }: { action: AIAction; onPick: (a: AIAction) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          onClick={() => onPick(a.id)}
          className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium ${action === a.id ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <a.icon className="h-5 w-5" />
          {a.label}
        </button>
      ))}
    </div>
  );
}

/** The input fields each action needs. */
function ActionInputs({
  action,
  form,
  update,
  notes,
  courses,
}: {
  action: AIAction;
  form: AIFormInputs;
  update: (patch: Partial<AIFormInputs>) => void;
  notes: Note[];
  courses: Course[];
}) {
  const course = <CourseSelect courses={courses} value={form.courseId} onChange={(courseId) => update({ courseId })} />;
  const note = <NoteSelect notes={notes} value={form.noteId} onChange={(noteId) => update({ noteId })} />;
  const setText = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ text: e.target.value });
  const setCount = (e: React.ChangeEvent<HTMLInputElement>) => update({ count: e.target.value });

  switch (action) {
    case "explain":
      return (
        <>
          <label className="text-xs font-medium text-gray-700">Concept to explain *</label>
          <Input value={form.text} onChange={setText} placeholder="e.g. Photosynthesis, Bayes theorem" />
          <label className="text-xs font-medium text-gray-700">Course (optional)</label>
          {course}
        </>
      );
    case "summarize":
      return (
        <>
          <label className="text-xs font-medium text-gray-700">Select note to summarize</label>
          {note}
          <p className="text-xs text-gray-400">Or paste content below (if no note selected)</p>
          <textarea rows={3} value={form.text} onChange={setText} placeholder="Paste note content to summarize…" className={TEXTAREA_CLASS} />
        </>
      );
    case "flashcards":
    case "quiz":
      return (
        <>
          <label className="text-xs font-medium text-gray-700">Source note</label>
          {note}
          <textarea rows={3} value={form.text} onChange={setText} placeholder="Or paste content here…" className={TEXTAREA_CLASS} />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Count</label>
            <Input type="number" min={1} max={10} value={form.count} onChange={setCount} className="w-20" />
            {course}
          </div>
        </>
      );
    case "plan":
      return (
        <>
          <label className="text-xs font-medium">Topic *</label>
          <Input value={form.text} onChange={setText} placeholder="e.g. Final exam revision, Chapter 1-3" />
          <div className="flex gap-2">
            {course}
            <Input type="number" min={1} max={30} value={form.count} onChange={setCount} className="w-24" placeholder="Days" />
          </div>
        </>
      );
  }
}

function AIErrorNotice({ error }: { error: string | null }) {
  if (!error) return null;
  if (!error.includes("not configured")) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">AI not configured</p>
        <p className="text-xs">{error}</p>
        <p className="mt-1 text-xs">Env vars are read when the server starts, so restart <code>npm run dev</code> after editing <code>.env.local</code>. Keys are server-only.</p>
      </div>
    </div>
  );
}

const SAVE_BUTTONS: Partial<Record<AIAction, { kind: SaveKind; label: string; needsData: boolean }>> = {
  flashcards: { kind: "flashcards", label: "Save as flashcards", needsData: true },
  quiz: { kind: "quiz", label: "Save as quiz", needsData: true },
  summarize: { kind: "summary", label: "Save as new note", needsData: false },
};

function ResultCard({
  action,
  result,
  hasData,
  cached,
  loading,
  saves,
  onRegenerate,
}: {
  action: AIAction;
  result: string;
  hasData: boolean;
  cached: boolean;
  loading: boolean;
  saves: ReturnType<typeof useAISaves>;
  onRegenerate: () => void;
}) {
  const save = SAVE_BUTTONS[action];
  const onSave = { flashcards: saves.saveFlashcards, quiz: saves.saveQuiz, summary: saves.saveSummary };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" /> AI Result
          {cached && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray px-2 py-0.5 text-xs font-normal text-gray-600">
              <Clock className="h-3 w-3" /> Saved answer
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap rounded bg-brand-gray/30 p-3 text-sm leading-relaxed text-gray-800">{result}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {save && (!save.needsData || hasData) && (
            <Button size="sm" onClick={onSave[save.kind]} disabled={saves.saving !== null}>
              {saves.saving === save.kind ? "Saving…" : save.label}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Every stored answer, oldest kept until deleted. View loads one into the result card. */
function SavedAnswersCard({
  entries,
  busy,
  onView,
  onDelete,
  onClearAll,
}: {
  entries: AICachedResult[];
  busy: string | null;
  onView: (entry: AICachedResult) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-gray-500" /> Saved answers
            {entries.length > 0 && <span className="text-xs font-normal text-gray-400">({entries.length})</span>}
          </CardTitle>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onClearAll} disabled={busy === "all"}>
              {busy === "all" ? "Clearing…" : "Clear all"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-xs text-gray-500">
            Answers you generate are saved here and stay until you delete them. Ask the same question again and it comes back instantly.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-md border border-gray-100 bg-brand-gray/20 p-2">
              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">{entry.action}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{entry.label}</span>
              <span className="shrink-0 text-xs text-gray-400">{aiCacheAgeLabel(entry.createdAt)}</span>
              <Button size="sm" variant="ghost" onClick={() => onView(entry)}>View</Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(entry.id)}
                disabled={busy === entry.id}
                aria-label={`Delete saved answer for ${entry.label}`}
              >
                {busy === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function AIAssistantTab({ notes, courses, cachedResults, onNoteCreated, onCardsCreated, onQuizCreated }: Props) {
  const [action, setAction] = React.useState<AIAction>("explain");
  const [form, setForm] = React.useState<AIFormInputs>({ text: "", noteId: "", courseId: "", count: "5" });
  const update = (patch: Partial<AIFormInputs>) => setForm((f) => ({ ...f, ...patch }));
  const ai = useAIRequest();
  const history = useAiCacheHistory(cachedResults);
  const saves = useAISaves({ generated: ai.generated, result: ai.result, form, notes, onNoteCreated, onCardsCreated, onQuizCreated });

  const pickAction = (next: AIAction) => {
    setAction(next);
    ai.reset();
  };

  const submit = () => {
    const req = buildAIRequest(action, form);
    if ("error" in req) return ai.setError(req.error);
    return ai.run(req.endpoint, req.body, { onStored: history.reload });
  };

  /** Re-ask the last request with `refresh`, so the stored answer is replaced by a new one. */
  const regenerate = () => {
    const prev = ai.last.current;
    if (!prev) return ai.setError("Ask the AI something first.");
    return ai.run(prev.endpoint, prev.body, { refresh: true, onStored: history.reload });
  };

  /** Load a stored answer into the result card without calling the AI. */
  const viewEntry = (entry: AICachedResult) => {
    setAction(entry.action);
    ai.showData(entry.data);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-600" /> AI Study Assistant
          </CardTitle>
          <p className="text-xs text-gray-500">Server-side AI — keys never exposed to the browser. Every answer is saved, so asking again returns it instantly. Real responses only; shows configuration error if not set up.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionPicker action={action} onPick={pickAction} />

          <div className="space-y-3 rounded-lg border border-gray-100 bg-brand-gray/20 p-4">
            <ActionInputs action={action} form={form} update={update} notes={notes} courses={courses} />
            <Button onClick={submit} disabled={ai.loading} className="w-full">
              {ai.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {ai.loading ? "Thinking…" : AI_SUBMIT_LABEL[action]}
            </Button>
          </div>

          <AIErrorNotice error={ai.error} />

          {ai.result && (
            <ResultCard
              action={action}
              result={ai.result}
              hasData={Boolean(ai.generated)}
              cached={ai.cached}
              loading={ai.loading}
              saves={saves}
              onRegenerate={regenerate}
            />
          )}
        </CardContent>
      </Card>

      <SavedAnswersCard
        entries={history.entries}
        busy={history.busy}
        onView={viewEntry}
        onDelete={history.remove}
        onClearAll={history.clearAll}
      />
    </div>
  );
}
