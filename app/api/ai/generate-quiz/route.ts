import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { noteId?: string; content?: string; count?: number; courseId?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 }); }

  let content = body.content?.trim();
  if (body.noteId) {
    const { data: note } = await supabase.from("notes").select("content, title").eq("id", body.noteId).eq("user_id", user.id).single();
    if (!note) return NextResponse.json({ success: false, message: "Note not found." }, { status: 404 });
    content = note.content ?? "";
    body.title = body.title ?? note.title;
  }
  if (!content || content.length < 30) return NextResponse.json({ success: false, message: "Provide content to generate quiz." }, { status: 400 });

  const count = Math.min(Math.max(body.count ?? 5, 1), 8);
  const system = `You are a quiz generator. Return ONLY valid JSON with no markdown fences. Structure: {"questions": [{"question_text":"...", "question_type":"multiple_choice|true_false|short_answer", "options":["A","B","C","D"] (only for multiple_choice), "correct_answer":"...", "explanation":"..."}]}. For multiple_choice, provide 4 options and correct_answer must be one of them. For true_false, correct_answer is "True" or "False". Keep questions clear. No grades.`;
  const prompt = `From this note titled "${body.title ?? "Study material"}", generate ${count} quiz questions as JSON:\n\n${content.slice(0, 6000)}`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }

  let parsed: { questions: unknown[] } | null = null;
  try {
    const jsonStr = result.text.replace(/```json\s*|\s*```/g, "").trim();
    parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray((parsed as { questions?: unknown[] }).questions)) throw new Error("Invalid structure");
  } catch {
    return NextResponse.json({ success: false, message: "AI returned invalid JSON. Raw: " + result.text.slice(0, 500) }, { status: 502 });
  }

  return NextResponse.json({ success: true, data: parsed });
}
