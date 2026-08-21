import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { noteId?: string; content?: string; count?: number; courseId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 }); }

  let content = body.content?.trim();
  if (body.noteId) {
    const { data: note } = await supabase.from("notes").select("content, title").eq("id", body.noteId).eq("user_id", user.id).single();
    if (!note) return NextResponse.json({ success: false, message: "Note not found." }, { status: 404 });
    content = note.content ?? "";
  }
  if (!content || content.length < 30) return NextResponse.json({ success: false, message: "Provide note content (at least 30 chars) to generate flashcards." }, { status: 400 });

  const count = Math.min(Math.max(body.count ?? 5, 1), 10);
  const system = "You are a flashcard generator for students. Create concise, clear flashcards. Return ONLY valid JSON array with no markdown fences. Each item: {\"front\": \"question\", \"back\": \"answer\"}. Keep front under 120 chars, back under 300 chars. No grades/GPA.";
  const prompt = `From this note, generate ${count} flashcards as JSON array:\n\n${content.slice(0, 6000)}\n\nReturn JSON only.`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }

  // Try to parse JSON from AI response
  let parsed: { front: string; back: string }[] = [];
  try {
    const jsonStr = result.text.replace(/```json\s*|\s*```/g, "").trim();
    const maybe = JSON.parse(jsonStr);
    if (Array.isArray(maybe)) parsed = maybe.filter((x) => x.front && x.back).slice(0, count);
    else throw new Error("Not an array");
  } catch {
    return NextResponse.json({ success: false, message: "AI returned invalid JSON. Raw: " + result.text.slice(0, 500) }, { status: 502 });
  }

  if (parsed.length === 0) return NextResponse.json({ success: false, message: "Could not parse flashcards from AI response." }, { status: 502 });

  return NextResponse.json({ success: true, data: { flashcards: parsed } });
}
