"use client";

import * as React from "react";
import { Search, Star, StarOff, Pencil, Trash2, Plus, BookOpen, Tag, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/useToast";
import { notesClientService } from "@/services/notesClient.service";
import { createClient } from "@/lib/supabase/client";
import { noteSchema, type NoteFormValues } from "@/lib/validations/study";
import { MarkdownPreview } from "@/components/study/MarkdownPreview";
import {
  findUnlinkedAttachments,
  linkedAttachments,
  resolveLinks,
  splitKeptDropped,
  stripAttachmentLink,
  toNoteDraft,
  toUrlMap,
  type DialogPdf,
  type PendingPdf,
} from "@/lib/notesForm";
import type { Note, CourseOption } from "@/types/study";

interface Props { initialNotes: Note[]; courses: CourseOption[] }

export function NotesTab({ initialNotes, courses }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [search, setSearch] = React.useState("");
  const [filterFav, setFilterFav] = React.useState(false);
  const [filterCourse, setFilterCourse] = React.useState<string>("all");
  const [filterTag, setFilterTag] = React.useState<string>("all");
  const [editing, setEditing] = React.useState<Note | null>(null);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<Note | null>(null);
  const [pendingPdfs, setPendingPdfs] = React.useState<PendingPdf[]>([]);
  const [viewPdfs, setViewPdfs] = React.useState<DialogPdf[]>([]);
  const [viewContent, setViewContent] = React.useState<string | null>(null);
  const [urlCache, setUrlCache] = React.useState<Record<string, string>>({});
  const [dialogPdfs, setDialogPdfs] = React.useState<DialogPdf[]>([]);

  // Uploads from an abandoned edit: discard on in-app navigation; a closed tab is caught by the sweep.
  const pendingRef = React.useRef(pendingPdfs);
  React.useEffect(() => {
    pendingRef.current = pendingPdfs;
  }, [pendingPdfs]);
  React.useEffect(() => {
    void notesClientService.sweepOrphanPdfs();
    return () => {
      if (pendingRef.current.length) void notesClientService.discardPdfUploads(pendingRef.current.map((p) => p.path));
    };
  }, []);

  const allTags = React.useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);

  const searchIndex = React.useMemo(
    () => new Map(notes.map((n) => [n.id, `${n.title} ${n.content ?? ""} ${(n.tags ?? []).join(" ")} ${n.courseName ?? ""}`.toLowerCase()])),
    [notes]
  );
  const deferredSearch = React.useDeferredValue(search);
  const filtered = React.useMemo(() => {
    let r = [...notes];
    const q = deferredSearch.trim().toLowerCase();
    if (q) {
      r = r.filter((n) => searchIndex.get(n.id)?.includes(q) ?? false);
    }
    if (filterFav) r = r.filter((n) => n.favorite);
    if (filterCourse !== "all") {
      if (filterCourse === "none") r = r.filter((n) => !n.courseId);
      else r = r.filter((n) => n.courseId === filterCourse);
    }
    if (filterTag !== "all") r = r.filter((n) => n.tags.includes(filterTag));
    return r;
  }, [notes, deferredSearch, searchIndex, filterFav, filterCourse, filterTag]);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: "", content: "", favorite: false, tags: "", courseId: "" },
  });

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        content: editing.content ?? "",
        favorite: editing.favorite,
        tags: editing.tags.join(", "),
        courseId: editing.courseId ?? "",
      });
      notesClientService.getAttachments(editing.id).then((out) => {
        setUrlCache((prev) => ({ ...prev, ...toUrlMap(out) }));
        setDialogPdfs(out);
      });
    } else {
      form.reset({ title: "", content: "", favorite: false, tags: "", courseId: "" });
    }
  }, [open, editing, form]);

  const persistAttachments = async (noteId: string, content: string) => {
    const { kept, dropped } = splitKeptDropped(content, pendingPdfs);
    if (dropped.length) void notesClientService.discardPdfUploads(dropped);
    if (kept.length > 0) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = user
        ? await supabase.from("note_attachments").insert(kept.map((p) => ({ user_id: user.id, note_id: noteId, file_url: p.path, file_name: p.file_name })))
        : { error: { message: "Not signed in." } };
      if (error) toast({ title: "PDF link not saved", description: error.message, variant: "error" });
    }
    setPendingPdfs([]);
  };

  const pruneRemovedAttachments = async (noteId: string, content: string) => {
    const unlinked = findUnlinkedAttachments(content, dialogPdfs);
    const removed = await notesClientService.removeAttachments(noteId, unlinked);
    if (!removed.success) toast({ title: "Could not remove PDF", description: removed.message, variant: "error" });
  };

  const onSubmit = async (values: NoteFormValues) => {
    const draft = toNoteDraft(values);
    const res = editing ? await notesClientService.updateNote(editing.id, draft) : await notesClientService.createNote(draft);
    if (!res.success || !res.data) {
      toast({ title: "Failed", description: res.message, variant: "error" });
      return;
    }
    const note = res.data as Note;
    if (editing) setNotes((prev) => prev.map((n) => (n.id === editing.id ? note : n)));
    else setNotes((prev) => [note, ...prev]);
    // Attachments follow the links in the saved content: a removed link drops its PDF.
    const content = draft.content ?? "";
    await persistAttachments(note.id, content);
    if (editing) await pruneRemovedAttachments(note.id, content);
    toast({ title: editing ? "Note updated" : "Note created", variant: "success" });
    setOpen(false);
    setEditing(null);
  };

  const unlinkPdf = (path: string) => {
    const cur = form.getValues("content") ?? "";
    form.setValue("content", stripAttachmentLink(cur, path), { shouldDirty: true });
  };

  const closeDialog = () => {
    if (pendingPdfs.length) void notesClientService.discardPdfUploads(pendingPdfs.map((p) => p.path));
    setPendingPdfs([]);
    setOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    const res = await notesClientService.deleteNote(id);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast({ title: "Note deleted", variant: "success" });
    } else toast({ title: "Failed", description: res.message, variant: "error" });
  };

  const applyWrap = (before: string, after: string) => {
    const ta = document.querySelector("textarea[name=content]") as HTMLTextAreaElement | null;
    const cur = form.getValues("content") ?? "";
    if (!ta) {
      form.setValue("content", `${before}${cur || "text"}${after}`, { shouldDirty: true });
      return;
    }
    const s = ta.selectionStart ?? cur.length;
    const e = ta.selectionEnd ?? cur.length;
    const sel = cur.slice(s, e) || "text";
    form.setValue("content", cur.slice(0, s) + before + sel + after + cur.slice(e), { shouldDirty: true });
  };

  const handlePdfAttach = async (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") return toast({ title: "Only PDF allowed", variant: "error" });
    if (f.size > 10 * 1024 * 1024) return toast({ title: "PDF exceeds 10MB limit", variant: "error" });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "You must be signed in.", variant: "error" });
    // Storage keys and the `attachment:` link regex both break on spaces/parens, so keep the key to safe chars.
    const path = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("notes-pdfs").upload(path, f, { contentType: "application/pdf" });
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "error" });
    const { data: fresh } = await supabase.storage.from("notes-pdfs").createSignedUrl(path, 3600);
    if (fresh?.signedUrl) setUrlCache((prev) => ({ ...prev, [path]: fresh.signedUrl }));
    const cur = form.getValues("content") ?? "";
    form.setValue("content", cur + `\n\n[PDF: ${f.name}](attachment:${path})`, { shouldDirty: true });
    // The row is written on save; closeDialog removes the file if the edit is abandoned.
    setPendingPdfs((prev) => [...prev, { path, file_name: f.name }]);
    toast({ title: "PDF attached (max 10MB)", variant: "success" });
  };

  const openNoteView = async (note: Note) => {
    setView(note);
    setViewContent(note.content ?? "");
    setViewPdfs([]);
    const out = await notesClientService.getAttachments(note.id);
    const merged = { ...urlCache, ...toUrlMap(out) };
    setUrlCache(merged);
    setViewContent(resolveLinks(note.content ?? "", merged));
    setViewPdfs(out);
  };

  const toggleFav = async (note: Note) => {
    const res = await notesClientService.toggleFavorite(note.id, !note.favorite);
    if (res.success) {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, favorite: !n.favorite } : n)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search title, content, tags, course…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); setPendingPdfs([]); setDialogPdfs([]); setOpen(true); }}>
          <Plus className="h-4 w-4" /> New Note
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={filterFav ? "default" : "outline"} size="sm" onClick={() => setFilterFav((v) => !v)}>
          <Star className="h-4 w-4" /> {filterFav ? "Favorites" : "All"}
        </Button>
        <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All courses</option>
          <option value="none">No course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {(search || filterFav || filterCourse !== "all" || filterTag !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterFav(false);
              setFilterCourse("all");
              setFilterTag("all");
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No notes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-brand-dark">{note.title}</h3>
                  <button onClick={() => toggleFav(note)} aria-label="Favorite" className={note.favorite ? "text-amber-500" : "text-gray-300"}>
                    {note.favorite ? <Star className="h-4 w-4 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
                  </button>
                </div>
                {note.content && (
                  <div className="line-clamp-3 text-xs text-gray-600">
                    <MarkdownPreview content={note.content.slice(0, 200)} />
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                  {note.courseName && <span className="rounded bg-brand-gray px-1.5 py-0.5 text-[11px] text-gray-600">{note.courseName}</span>}
                  {note.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">
                      <Tag className="h-3 w-3" /> {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openNoteView(note)}>
                      View
                    </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(note); setPendingPdfs([]); setDialogPdfs([]); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={closeDialog}>
          <div className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editing ? "Edit note" : "New note"}</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
                <FormField name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown supported)</FormLabel>
                    <div className="mb-1 flex gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => applyWrap("**", "**")}>B</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("content", "# " + form.getValues("content"), { shouldDirty: true })}>H1</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("content", form.getValues("content") + "`code`", { shouldDirty: true })}>{"</>"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("content", form.getValues("content") + "\n- item", { shouldDirty: true })}>• List</Button>
                    </div>
                    <FormControl><textarea rows={8} placeholder="Write in Markdown: # Heading, **bold**, *italic*, - list, [link](url), `code`" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...field} /></FormControl>
                    <FormMessage />
                    {field.value && (
                      <div className="rounded border bg-brand-gray/20 p-3">
                        <p className="mb-1 text-xs font-medium text-gray-500">Preview</p>
                        <MarkdownPreview content={resolveLinks(field.value ?? "", urlCache)} />
                      </div>
                    )}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-gray-700">Attach PDF (max 10MB)</label>
                      <input type="file" accept="application/pdf" className="mt-1 block text-xs" onChange={(e) => handlePdfAttach(e.target.files?.[0] ?? null)} />
                      {(() => {
                        const linked = linkedAttachments(field.value ?? "", dialogPdfs, pendingPdfs, urlCache);
                        if (!linked.length) return null;
                        return (
                          <div className="mt-1 space-y-1">
                            {linked.map((a) => (
                              <div key={a.path} className="flex items-center gap-2">
                                {a.url ? (
                                  <a href={a.url} target="_blank" rel="noopener" className="text-xs text-brand-royal underline">{a.name}</a>
                                ) : (
                                  <span className="text-xs text-gray-700">{a.name}</span>
                                )}
                                {!a.path.startsWith("http") && (
                                  <button type="button" aria-label={`Remove ${a.name}`} onClick={() => unlinkPdf(a.path)} className="text-gray-400 hover:text-red-600">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <p className="text-[11px] text-gray-500">Removed PDFs are deleted when you save.</p>
                          </div>
                        );
                      })()}
                    </div>
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField name="courseId" render={({ field }) => (
                    <FormItem><FormLabel>Course</FormLabel><FormControl><Select {...field}><option value="">No course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="tags" render={({ field }) => (
                    <FormItem><FormLabel>Tags (comma separated)</FormLabel><FormControl><Input placeholder="e.g. biology, exam" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField name="favorite" render={({ field }) => (
                  <FormItem className="flex items-center gap-2"><FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" /></FormControl><FormLabel className="!m-0">Favorite</FormLabel></FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
                  <Button type="submit" isLoading={form.formState.isSubmitting}>{editing ? "Save" : "Create"}</Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setView(null)}>
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-brand-dark">{view.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setView(null)}><X className="h-4 w-4" /></Button>
            </div>
            {view.courseName && <p className="text-xs text-gray-500">{view.courseName} • {new Date(view.updatedAt).toLocaleDateString()}</p>}
            <div className="mt-4 rounded border bg-brand-gray/20 p-4">
              <MarkdownPreview content={viewContent ?? view.content ?? ""} />
            </div>
            {viewPdfs.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-500">Attachments</p>
                {viewPdfs.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noopener" className="block text-xs text-brand-royal underline">
                    {a.name}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {view.tags.map((t) => (
                <span key={t} className="rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
