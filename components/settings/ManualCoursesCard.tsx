"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { manualCourseSchema, type ManualCourseInput } from "@/lib/validations/academics";
import { pointsToLetter } from "@/lib/gpa";
import { academicsClientService } from "@/services/academicsClient.service";
import { useToast } from "@/hooks/useToast";
import type { DashboardCourse } from "@/types/academics";

interface ManualCoursesCardProps {
  courses: DashboardCourse[];
  gradeScale: Record<string, number>;
}

const NO_GRADE = "__none__";

function gradeOptionsKeys(scale: Record<string, number>): string[] {
  return Object.keys(scale).sort((a, b) => (scale[b] ?? 0) - (scale[a] ?? 0));
}

/**
 * Manual course management. Students who aren't (fully) on Google Classroom
 * can still track courses and grades here; those grades and credits feed the
 * same GPA math as Classroom data.
 */
export function ManualCoursesCard({ courses, gradeScale }: ManualCoursesCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const addForm = useForm<ManualCourseInput>({
    resolver: zodResolver(manualCourseSchema),
    defaultValues: { name: "", creditHours: "3", gradeLetter: NO_GRADE },
  });

  const editForm = useForm<ManualCourseInput>({
    resolver: zodResolver(manualCourseSchema),
  });

  const run = async (op: () => Promise<{ success: boolean; message?: string }>, successMsg: string) => {
    const result = await op();
    toast({
      title: result.success ? successMsg : "Something went wrong",
      description: result.message,
      variant: result.success ? "success" : "error",
    });
    if (result.success) router.refresh();
  };

  const onAdd = async (input: ManualCourseInput) => {
    await run(
      () =>
        academicsClientService.addManualCourse({
          name: input.name,
          creditHours: Number(input.creditHours),
          gradePoints: toPoints(input.gradeLetter, gradeScale),
        }),
      "Course added"
    );
    addForm.reset({ name: "", creditHours: "3", gradeLetter: NO_GRADE });
  };

  const startEdit = (course: DashboardCourse) => {
    setEditingId(course.id);
    editForm.reset({
      name: course.name,
      creditHours: String(course.creditHours),
      gradeLetter:
        course.gradePoints != null ? (pointsToLetter(course.gradePoints, gradeScale) ?? NO_GRADE) : NO_GRADE,
    });
  };

  const onEdit = async (input: ManualCourseInput) => {
    if (!editingId) return;
    await run(
      () =>
        academicsClientService.updateManualCourse({
          id: editingId,
          name: input.name,
          creditHours: Number(input.creditHours),
          gradePoints: toPoints(input.gradeLetter, gradeScale),
        }),
      "Course updated"
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Add form */}
      <Form {...addForm}>
        <form
          onSubmit={addForm.handleSubmit(onAdd)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[2fr_1fr_1fr_auto]"
          noValidate
        >
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Advanced Calculus" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="creditHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credits</FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" min="0.5" max="20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="gradeLetter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value={NO_GRADE}>No grade yet</option>
                    {gradeOptionsKeys(gradeScale).map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="self-end" isLoading={addForm.formState.isSubmitting}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
      </Form>

      {/* Course list */}
      {courses.length === 0 ? (
        <p className="text-sm text-gray-500">
          No manual courses yet. Add one above to include a course that isn&apos;t on Google
          Classroom.
        </p>
      ) : (
        <ul className="space-y-2">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 bg-brand-gray/40 px-4 py-3"
            >
              {editingId === course.id ? (
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onEdit)}
                    className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end"
                    noValidate
                  >
                    <FormField
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="creditHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credits</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" min="0.5" max="20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="gradeLetter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl>
                            <Select {...field}>
                              <option value={NO_GRADE}>No grade</option>
                              {gradeOptionsKeys(gradeScale).map((letter) => (
                                <option key={letter} value={letter}>
                                  {letter}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="sm" isLoading={editForm.formState.isSubmitting}>
                      <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-dark">{course.name}</p>
                    <p className="text-xs text-gray-500">{course.creditHours} credits</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-royal">
                      {course.gradePoints != null
                        ? pointsToLetter(course.gradePoints, gradeScale) ?? course.gradePoints.toFixed(2)
                        : "No grade"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(course)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() =>
                        run(() => academicsClientService.deleteCourse(course.id), "Course removed")
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toPoints(letter: string | undefined, scale: Record<string, number>): number | null {
  if (!letter || letter === NO_GRADE) return null;
  const points = scale[letter];
  return points != null ? points : null;
}