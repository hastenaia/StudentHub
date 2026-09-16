import { BookOpen, CheckCircle2, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { completedTasks: number; studySessions: number; notesCreated: number }

export function StudyActivity({ completedTasks, studySessions, notesCreated }: Props) {
  const items = [
    { label: "Completed tasks", value: completedTasks, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Study sessions", value: studySessions, icon: BookOpen, color: "text-brand-royal bg-brand-royal/10" },
    { label: "Notes created", value: notesCreated, icon: StickyNote, color: "text-amber-600 bg-amber-50" },
  ];
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-brand-royal" /> Study Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="grid grid-cols-3 gap-3 auto-rows-fr">
          {items.map((it) => (
            <div key={it.label} className="flex min-h-[112px] flex-col items-center justify-center rounded-md border border-gray-100 bg-white px-3 py-4 text-center">
              <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${it.color}`}>
                <it.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-brand-dark">{it.value}</p>
              <p className="text-xs text-gray-500">{it.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex min-h-[18px] items-center justify-center">
          {completedTasks === 0 && studySessions === 0 && notesCreated === 0 ? (
            <p className="text-center text-xs text-gray-400">Complete tasks and sessions to see activity here.</p>
          ) : (
            <span className="invisible text-xs">placeholder</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
