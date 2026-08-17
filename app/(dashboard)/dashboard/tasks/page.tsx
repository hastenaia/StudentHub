import { createClient } from "@/lib/supabase/server";
import { getTasksData } from "@/services/tasks.service";
import { TasksView } from "@/components/tasks/TasksView";

export const metadata = { title: "Tasks — StudentHub" };

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const data = await getTasksData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">To-Do Tracker</h2>
        <p className="mt-1 text-sm text-gray-500">
          Kanban and list views, priorities, recurring tasks and a smart suggested order.
        </p>
      </div>
      <TasksView initialData={data} />
    </div>
  );
}
