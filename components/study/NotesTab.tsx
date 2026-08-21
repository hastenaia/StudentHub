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
import { noteSchema, type NoteFormValues } from "@/lib/validations/study";
import { MarkdownPreview } from "@/components/study/MarkdownPreview";
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

  const allTags = React.useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);

  const filtered = React.useMemo(() => {
    let r = [...notes];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((n) => [n.title, n.content ?? "", n.tags.join(" "), n.courseName ?? ""].join(" ").toLowerCase().includes(q));
    }
    if (filterFav) r = r.filter((n) => n.favorite);
    if (filterCourse !== "all") {
      if (filterCourse === "none") r = r.filter((n) => !n.courseId);
      else r = r.filter((n) => n.courseId === filterCourse);
    }
    if (filterTag !== "all") r = r.filter((n) => n.tags.includes(filterTag));
    return r;
  }, [notes, search, filterFav, filterCourse, filterTag]);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: "", content: "", favorite: false, tags: "", courseId: "" },
  });

  React.useEffect(() => {
    if (open) {
      if (editing) {
        form.reset({
          title: editing.title,
          content: editing.content ?? "",
          favorite: editing.favorite,
          tags: editing.tags.join(", "),
          courseId: editing.courseId ?? "",
        });
      } else {
        form.reset({ title: "", content: "", favorite: false, tags: "", courseId: "" });
      }
    }
  }, [open, editing, form]);

  const onSubmit = async (values: NoteFormValues) => {
    const draft = {
      title: values.title,
      content: values.content || null,
      favorite: values.favorite ?? false,
      tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) : [],
      courseId: values.courseId || null,
    };
    const res = editing ? await notesClientService.updateNote(editing.id, draft) : await notesClientService.createNote(draft);
    if (res.success && res.data) {
      if (editing) setNotes((prev) => prev.map((n) => (n.id === editing.id ? (res.data as Note) : n)));
      else setNotes((prev) => [(res.data as Note), ...prev]);
      toast({ title: editing ? "Note updated" : "Note created", variant: "success" });
      setOpen(false);
      setEditing(null);
    } else {
      toast({ title: "Failed", description: res.message, variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await notesClientService.deleteNote(id);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast({ title: "Note deleted", variant: "success" });
    } else toast({ title: "Failed", description: res.message, variant: "error" });
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
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
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
                  <Button variant="ghost" size="sm" onClick={() => setView(note)}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(note); setOpen(true); }}>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setOpen(false)}>
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
                    <FormControl><textarea rows={8} placeholder="Write in Markdown: # Heading, **bold**, *italic*, - list, [link](url), `code`" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...field} /></FormControl>
                    <FormMessage />
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
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
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
              <MarkdownPreview content={view.content ?? ""} />
            </div>
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
