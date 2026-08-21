import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
  data: {
    completed: number;
    pending: number;
    overdue: number;
    total: number;
    completionRate: number;
    byStatus: { status: string; count: number }[];
  };
}

export function AnalyticsTasks({ data }: Props) {
  const max = Math.max(1, ...data.byStatus.map((s) => s.count));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4 text-brand-royal" /> Tasks
        </CardTitle>
        <CardDescription>
          {data.total === 0 ? "No tasks yet" : `${data.completed} of ${data.total} completed • ${data.completionRate}% completion rate`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{data.completed}</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-sky-700">
              <Clock className="h-3.5 w-3.5" /> Pending
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{data.pending}</p>
          </div>
          <div className={`rounded-lg px-3 py-3 text-center ${data.overdue > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <p className={`flex items-center justify-center gap-1 text-xs font-medium ${data.overdue > 0 ? "text-amber-700" : "text-gray-600"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
            </p>
            <p className={`mt-1 text-2xl font-bold ${data.overdue > 0 ? "text-amber-700" : "text-gray-700"}`}>{data.overdue}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Completion rate</span>
            <span className="font-medium text-brand-dark">{data.completionRate}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${data.completionRate}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {data.byStatus.map((s) => (
              <div key={s.status} className="rounded-md border border-gray-100 bg-brand-gray/30 px-2 py-2 text-center">
                <p className="text-xs font-medium text-gray-500">{s.status}</p>
                <p className="text-sm font-bold text-brand-dark">{s.count}</p>
                <div className="mt-1 h-1 w-full rounded bg-gray-100">
                  <div className="h-1 rounded bg-brand-royal" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
