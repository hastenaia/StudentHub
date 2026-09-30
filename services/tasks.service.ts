import { createClient } from "@/lib/supabase/server";
import { buildSchedule } from "@/lib/scheduling";
import { taskRowToView } from "@/lib/taskView";
import type { TasksViewData } from "@/types/tasks";
import { withActiveCourses } from "@/lib/supabase/queries";

/**
 * Server-side assembly for the To-Do Tracker page. Reads the user's tasks and
 * courses, builds the view models and runs the urgency scheduler (`buildSchedule`) over the
 * actionable (not-done) tasks so the Suggested Order panel is pre-rendered.
 */

export async function getTasksData(userId: string): Promise<TasksViewData> {
  const supabase = await createClient();
  const { rows, courses, courseMap } = await withActiveCourses(
    supabase,
    userId,
    supabase.from("tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
  );

  const tasks = rows.map((row) => taskRowToView(row, courseMap));

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
