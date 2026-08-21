"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, CalendarPlus, GraduationCap, Timer, StickyNote, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { TaskForm } from "@/components/tasks/TaskForm";
import { EventForm } from "@/components/schedule/EventForm";
import { CourseForm } from "@/components/courses/CourseForm";
import { focusClientService } from "@/services/focusClient.service";
import { notesClientService } from "@/services/notesClient.service";
import { coursesClientService } from "@/services/coursesClient.service";
import { tasksClientService } from "@/services/tasksClient.service";
import type { ScheduleCourseOption } from "@/types/schedule";
import type { TaskDraft } from "@/types/tasks";
import type { ScheduleDraft } from "@/types/schedule";
import type { CourseDraft } from "@/types/courses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props { courses: ScheduleCourseOption[] }

export function QuickActions({ courses }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [eventOpen, setEventOpen] = React.useState(false);
  const [courseOpen, setCourseOpen] = React.useState(false);
  const [focusOpen, setFocusOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [focusMinutes, setFocusMinutes] = React.useState("25");
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteContent, setNoteContent] = React.useState("");

  const handleCreateTask = async (draft: TaskDraft) => {
    const res = await tasksClientService.createTask(draft);
    toast({ title: res.success ? "Task created" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) { setTaskOpen(false); router.refresh(); }
  };
  const handleCreateEvent = async (draft: ScheduleDraft) => {
    const { scheduleClientService } = await import("@/services/scheduleClient.service");
    const res = await scheduleClientService.createEvent(draft);
    toast({ title: res.success ? "Event created" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) { setEventOpen(false); router.refresh(); }
  };
  const handleCreateCourse = async (draft: CourseDraft) => {
    const res = await coursesClientService.createCourse(draft);
    toast({ title: res.success ? "Course created" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) { setCourseOpen(false); router.refresh(); }
  };
  const handleStartFocus = async () => {
    const mins = Number(focusMinutes) || 25;
    const res = await focusClientService.startSession(mins);
    toast({ title: res.success ? "Focus started" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) { setFocusOpen(false); router.refresh(); }
  };
  const handleCreateNote = async () => {
    const res = await notesClientService.createNote({ title: noteTitle, content: noteContent });
    toast({ title: res.success ? "Note created" : "Failed", description: res.message, variant: res.success ? "success" : "error" });
    if (res.success) { setNoteOpen(false); setNoteTitle(""); setNoteContent(""); router.refresh(); }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5">
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setTaskOpen(true)}
            >
              <ClipboardList className="h-5 w-5 shrink-0 text-brand-royal" />
              <span className="whitespace-normal break-words text-center leading-tight">Add Task</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setEventOpen(true)}
            >
              <CalendarPlus className="h-5 w-5 shrink-0 text-brand-royal" />
              <span className="whitespace-normal break-words text-center leading-tight">Add Event</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setCourseOpen(true)}
            >
              <GraduationCap className="h-5 w-5 shrink-0 text-brand-royal" />
              <span className="whitespace-normal break-words text-center leading-tight">Add Course</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setFocusOpen(true)}
            >
              <Timer className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="whitespace-normal break-words text-center leading-tight">Start Focus</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setNoteOpen(true)}
            >
              <StickyNote className="h-5 w-5 shrink-0 text-amber-600" />
              <span className="whitespace-normal break-words text-center leading-tight">Create Note</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto min-h-[80px] w-full min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 whitespace-normal break-words px-3 py-3 text-center text-xs leading-tight hover:bg-brand-royal/[0.04] hover:border-brand-royal/30"
              onClick={() => setAiOpen(true)}
            >
              <Bot className="h-5 w-5 shrink-0 text-purple-600" />
              <span className="whitespace-normal break-words text-center leading-tight">Ask AI</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <TaskForm open={taskOpen} initialDraft={null} defaultStatus="todo" courses={courses.map((c) => ({ id: c.id, name: c.name, color: c.color }))} onClose={() => setTaskOpen(false)} onSubmit={handleCreateTask} />
      <EventForm open={eventOpen} initialDraft={null} courses={courses} onClose={() => setEventOpen(false)} onSubmit={handleCreateEvent} />
      <CourseForm open={courseOpen} initialDraft={null} onClose={() => setCourseOpen(false)} onSubmit={handleCreateCourse} />

      {focusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFocusOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-brand-dark">Start Focus</h3>
            <p className="mt-1 text-sm text-gray-500">Log a focus session — it powers your streak and today&apos;s minutes.</p>
            <div className="mt-4">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={5} max={180} value={focusMinutes} onChange={(e) => setFocusMinutes(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFocusOpen(false)}>Cancel</Button>
              <Button onClick={handleStartFocus}>Start Focus</Button>
            </div>
          </div>
        </div>
      )}

      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNoteOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-brand-dark">Create Note</h3>
            <div className="mt-4 space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Lecture 5 key points" />
              </div>
              <div>
                <Label>Content</Label>
                <textarea rows={4} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your note..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateNote} disabled={!noteTitle.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAiOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold text-brand-dark">
              <Bot className="h-5 w-5 text-purple-600" /> Ask AI
            </h3>
            <p className="mt-2 text-sm text-gray-600">AI assistance is coming soon. For now, try the smart recommendation on your dashboard or create a task to stay focused.</p>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setAiOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
