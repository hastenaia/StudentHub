import { createClient } from "@/lib/supabase/server";
import { getNotesData } from "@/services/notes.service";
import { NotesView } from "@/components/notes/NotesView";

export const metadata = { title: "Notes — StudentHub" };

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="text-sm text-gray-500">You need to be signed in.</p>;

  const { notes, courses } = await getNotesData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Notes</h2>
        <p className="mt-1 text-sm text-gray-500">Markdown notes organized into categories, with tags, search, and an AI study assistant.</p>
      </div>
      <NotesView initialNotes={notes} courses={courses} />
    </div>
  );
}
