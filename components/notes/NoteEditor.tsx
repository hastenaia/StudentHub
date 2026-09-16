"use client";
import * as React from "react";
import { Bold, Italic, Heading1, List, Tag, Paperclip, Eye, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MockNote } from "@/lib/mocks/notes";

export function NoteEditor({ note, onSave }: { note: MockNote; onSave: (n: MockNote) => void }) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const [title, setTitle] = React.useState(note.title);
  const [body, setBody] = React.useState(note.bodyMd);
  const [tags, setTags] = React.useState(note.tags.join(", "));
  const [pdfName, setPdfName] = React.useState<string | null>(note.pdfName);

  React.useEffect(() => {
    const id = setTimeout(() => {
      setTitle(note.title); setBody(note.bodyMd); setTags(note.tags.join(", ")); setPdfName(note.pdfName);
    }, 0);
    return () => clearTimeout(id);
  }, [note]);

  const handleSave = () => {
    onSave({ ...note, title, bodyMd: body, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), pdfName });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-brand-royal" /> {note.title}
        </CardTitle>
        <CardDescription>WYSIWYG + Markdown · Tags · PDF attachment (mock)</CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>Edit</Button>
          <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}><Eye className="h-4 w-4" /> Preview</Button>
          <span className="ml-auto flex gap-1">
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Bold className="h-3 w-3" /> Bold</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Italic className="h-3 w-3" /> Italic</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><Heading1 className="h-3 w-3" /> H1</span>
            <span className="flex items-center gap-1 rounded bg-brand-gray px-2 py-1 text-xs"><List className="h-3 w-3" /> List</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-400" />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags comma separated: exam, formulas" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-brand-gray/30 px-3 py-2">
          <Paperclip className="h-4 w-4 text-gray-500" />
          {pdfName ? (
            <span className="text-xs text-brand-dark">📄 {pdfName} <button onClick={() => setPdfName(null)} className="ml-2 text-red-500">Remove</button></span>
          ) : (
            <label className="cursor-pointer text-xs text-brand-royal hover:underline">
              Attach PDF
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfName(f.name); }} />
            </label>
          )}
          <span className="ml-auto text-xs text-gray-400">Max 10MB (mock)</span>
        </div>
        {mode === "edit" ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full flex-1 rounded-md border border-gray-300 bg-white p-3 text-sm text-brand-dark placeholder:text-gray-400 focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal" placeholder="Write in Markdown… Supports **bold**, *italic*, # headings, - lists, > quotes" />
        ) : (
          <div className="flex-1 rounded-md border border-gray-200 bg-brand-gray/40 p-4 text-sm leading-6 text-brand-dark">
            <pre className="whitespace-pre-wrap font-sans">{body}</pre>
            <p className="mt-3 text-xs text-gray-400">Preview is a lightweight mock — wire `react-markdown` for real rendering.</p>
          </div>
        )}
        <Button onClick={handleSave}>Save note</Button>
      </CardContent>
    </Card>
  );
}
