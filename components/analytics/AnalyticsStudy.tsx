import { StickyNote, Layers, HelpCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
  data: { notesCreated: number; flashcardsStudied: number; flashcardsTotal: number; quizzesCompleted: number; studySessions: number };
}

export function AnalyticsStudy({ data }: Props) {
  const studiedPct = data.flashcardsTotal > 0 ? Math.round((data.flashcardsStudied / data.flashcardsTotal) * 100) : 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-brand-royal" /> Study
        </CardTitle>
        <CardDescription>Notes, flashcards, quizzes and study sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-4 text-center">
            <StickyNote className="mx-auto h-5 w-5 text-amber-600" />
            <p className="mt-1 text-xl font-bold text-brand-dark">{data.notesCreated}</p>
            <p className="text-xs text-gray-500">notes created</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-4 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-purple-600" />
            <p className="mt-1 text-xl font-bold text-brand-dark">{data.studySessions}</p>
            <p className="text-xs text-gray-500">study sessions</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-4 text-center">
            <Layers className="mx-auto h-5 w-5 text-sky-600" />
            <p className="mt-1 text-xl font-bold text-brand-dark">
              {data.flashcardsStudied}/{data.flashcardsTotal}
            </p>
            <p className="text-xs text-gray-500">flashcards studied</p>
            <div className="mx-auto mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-sky-500" style={{ width: `${studiedPct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">{studiedPct}%</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-4 text-center">
            <HelpCircle className="mx-auto h-5 w-5 text-emerald-600" />
            <p className="mt-1 text-xl font-bold text-brand-dark">{data.quizzesCompleted}</p>
            <p className="text-xs text-gray-500">quizzes completed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
