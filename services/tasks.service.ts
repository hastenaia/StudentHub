import { createClient } from "@/lib/supabase/server";
import { buildSchedule } from "@/lib/scheduling";
import { taskRowToView } from "@/lib/taskView";
import type { TaskCourseOption, TasksViewData } from "@/types/tasks";

/**
 * Server-side assembly for the To-Do Tracker page. Reads the user's tasks and
 * courses, builds the view models and runs the min-heap scheduler over the
 * actionable (not-done) tasks so the Suggested Order panel is pre-rendered.
 */

export async function getTasksData(userId: string): Promise<TasksViewData> {
  const supabase = await createClient();
  const [tasksRes, coursesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("courses")
      .select("id, name, course_name, color")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("name"),
  ]);

  const courses: TaskCourseOption[] = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    name: (c as { course_name?: string | null; name: string }).course_name ?? c.name,
    color: c.color,
  }));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const tasks = (tasksRes.data ?? []).map((row) => taskRowToView(row, courseMap));

  const schedule = buildSchedule(
    tasks
      .filter((task) => task.status !== "done")
      .map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dueAt: task.dueAt,
        estimateMinutes: task.estimateMinutes,
      }))
  );

  return { tasks, courses, schedule };
}
