import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { noteId?: string; content?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 }); }

  let content = body.content?.trim();
  let title = body.title?.trim() ?? "Note";

  if (body.noteId) {
    const { data: note } = await supabase.from("notes").select("title, content").eq("id", body.noteId).eq("user_id", user.id).single();
    if (!note) return NextResponse.json({ success: false, message: "Note not found." }, { status: 404 });
    content = note.content ?? "";
    title = note.title;
  }

  if (!content) return NextResponse.json({ success: false, message: "Content is required to summarize." }, { status: 400 });
  if (content.length < 20) return NextResponse.json({ success: false, message: "Content is too short to summarize." }, { status: 400 });

  const system = "You are a study assistant. Summarize notes into clear bullet points, key takeaways, and a one-paragraph summary. Keep it concise and student-friendly. Do not use GPA or grades.";
  const prompt = `Summarize this note titled "${title}":\n\n${content.slice(0, 6000)}\n\nProvide: 1) 3-5 bullet key points 2) One-paragraph summary`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }
  return NextResponse.json({ success: true, data: { summary: result.text, title } });
}
