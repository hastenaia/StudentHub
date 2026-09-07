"use client";
import * as React from "react";
import { FileText, Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockNotes, type MockNote } from "@/lib/mocks/notes";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { AiAssistantPanel } from "@/components/notes/AiAssistantPanel";
import { useToast } from "@/hooks/useToast";

export default function NotesPage() {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<MockNote[]>(mockNotes);
  const [selectedId, setSelectedId] = React.useState<string>(mockNotes[0].id);
  const [filter, setFilter] = React.useState("");
  const selected = notes.find((n) => n.id === selectedId) ?? notes[0];

  const filtered = notes.filter((n) =>
    [n.title, n.course, n.tags.join(" ")].join(" ").toLowerCase().includes(filter.toLowerCase())
  );

  const handleSave = (updated: MockNote) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    toast({ title: "Note saved (mock)", description: updated.title, variant: "success" });
  };

  const handleNew = () => {
    const n: MockNote = { id: `n${Date.now()}`, title: "Untitled note", course: "General", courseId: "c1", tags: [], updatedAt: new Date().toISOString(), bodyMd: "# New note\nStart writing…", pdfUrl: null, pdfName: null };
    setNotes((prev) => [n, ...prev]);
    setSelectedId(n.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Notes</h2>
          <p className="mt-1 text-sm text-gray-500">WYSIWYG + Markdown, tags, and PDF attachments (FR-09) with AI assistant (FR-10).</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4" /> New note</Button>
      </div>

      <AiAssistantPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-brand-royal" /> All notes</CardTitle>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search notes, course, tags…" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((n) => (
              <button key={n.id} onClick={() => setSelectedId(n.id)} className={`w-full rounded-md border px-3 py-3 text-left ${selectedId === n.id ? "border-brand-royal bg-brand-royal/5" : "border-gray-100 bg-white hover:bg-brand-gray/40"}`}>
                <p className="truncate text-sm font-medium text-brand-dark">{n.title}</p>
                <p className="text-xs text-gray-500">{n.course} · {n.tags.join(", ") || "no tags"}</p>
                {n.pdfName && <p className="text-xs text-blue-600">📄 {n.pdfName}</p>}
              </button>
            ))}
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No notes match.</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selected ? (
            <NoteEditor note={selected} onSave={handleSave} />
          ) : (
            <Card><CardContent className="py-16 text-center text-sm text-gray-500">Select a note</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
