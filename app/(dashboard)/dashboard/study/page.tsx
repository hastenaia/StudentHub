import { createClient } from "@/lib/supabase/server";
import { getNotesData } from "@/services/notes.service";
import { getFlashcardsData } from "@/services/flashcards.service";
import { getQuizzesData } from "@/services/quizzes.service";
import { StudyHubView } from "@/components/study/StudyHubView";

export const metadata = { title: "Study Hub — StudentHub" };

export default async function StudyHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="text-sm text-gray-500">You need to be signed in.</p>;

  const [notesData, flashcardsData, quizzesData] = await Promise.all([
    getNotesData(user.id),
    getFlashcardsData(user.id),
    getQuizzesData(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Study Hub</h2>
        <p className="mt-1 text-sm text-gray-500">Notes, flashcards, quizzes, and AI study assistant — all in one place.</p>
      </div>
      <StudyHubView
        initialNotes={notesData.notes}
        initialFlashcards={flashcardsData.flashcards}
        initialQuizzes={quizzesData.quizzes}
        courses={notesData.courses}
      />
    </div>
  );
}
