import { CheckCircle2, BookOpen, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { completedTasks: number; studySessions: number; notesCreated: number }

export function StudyActivity({ completedTasks, studySessions, notesCreated }: Props) {
  const items = [
    { label: "Completed tasks", value: completedTasks, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Study sessions", value: studySessions, icon: BookOpen, color: "text-brand-royal bg-brand-royal/10" },
    { label: "Notes created", value: notesCreated, icon: StickyNote, color: "text-amber-600 bg-amber-50" },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Study Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg border border-gray-100 bg-white px-3 py-4 text-center">
              <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${it.color}`}>
                <it.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xl font-bold text-brand-dark">{it.value}</p>
              <p className="text-xs text-gray-500">{it.label}</p>
            </div>
          ))}
        </div>
        {completedTasks === 0 && studySessions === 0 && notesCreated === 0 && (
          <p className="mt-3 text-center text-xs text-gray-400">Complete tasks and sessions to see activity here.</p>
        )}
      </CardContent>
    </Card>
  );
}
