"use client";

import * as React from "react";
import { Search, Plus, BookOpen, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { coursesClientService } from "@/services/coursesClient.service";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseForm } from "@/components/courses/CourseForm";
import type { Course, CourseDraft } from "@/types/courses";

interface CoursesViewProps {
  initialCourses: Course[];
}

export function CoursesView({ initialCourses }: CoursesViewProps) {
  const { toast } = useToast();
  const [courses, setCourses] = React.useState<Course[]>(initialCourses);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Keep initial sync only — local mutations are handled optimistically
  // no effect needed; server refresh will remount via key if required

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      [c.course_name, c.course_code ?? "", c.instructor ?? "", c.description ?? "", c.room ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [courses, search]);

  const notify = (success: boolean, title: string, description?: string) => {
    toast({ title, description, variant: success ? "success" : "error" });
  };

  const handleCreate = async (draft: CourseDraft) => {
    setIsLoading(true);
    const result = await coursesClientService.createCourse(draft);
    setIsLoading(false);
    if (result.success && result.data) {
      setCourses((prev) => [result.data as Course, ...prev]);
      setFormOpen(false);
      notify(true, "Course created", result.message);
    } else {
      notify(false, "Couldn't create course", result.message);
    }
  };

  const handleUpdate = async (draft: CourseDraft) => {
    if (!editing) return;
    setIsLoading(true);
    const result = await coursesClientService.updateCourse(editing.id, draft);
    setIsLoading(false);
    if (result.success && result.data) {
      setCourses((prev) => prev.map((c) => (c.id === editing.id ? (result.data as Course) : c)));
      setEditing(null);
      setFormOpen(false);
      notify(true, "Course updated", result.message);
    } else {
      notify(false, "Couldn't update course", result.message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    setIsLoading(true);
    const result = await coursesClientService.deleteCourse(id);
    setIsLoading(false);
    if (result.success) {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      notify(true, "Course deleted", result.message);
    } else {
      notify(false, "Couldn't delete course", result.message);
    }
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const draftFromCourse = (course: Course | null): CourseDraft | null => {
    if (!course) return null;
    return {
      course_code: course.course_code ?? "",
      course_name: course.course_name,
      instructor: course.instructor ?? "",
      description: course.description ?? "",
      room: course.room ?? "",
      color: course.color ?? "#0033A0",
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, code, instructor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" /> Add course
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Updating…
        </div>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
              <BookOpen className="h-6 w-6 text-brand-royal" />
            </div>
            <p className="text-sm font-medium text-brand-dark">No courses yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              Add your first course to start organizing assignments, tasks, and schedule.
            </p>
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="h-4 w-4" /> Create course
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-brand-dark">No matching courses</p>
            <p className="text-sm text-gray-500">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      <CourseForm
        open={formOpen}
        initialDraft={draftFromCourse(editing)}
        onClose={closeForm}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-dark">Delete course?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-brand-dark">
                {courses.find((c) => c.id === deleteConfirm)?.course_name}
              </span>
              ? Related tasks will be kept but unlinked.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
