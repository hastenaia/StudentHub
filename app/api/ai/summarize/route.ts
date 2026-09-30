import { NextResponse } from "next/server";
import { jsonError, runAI, startNoteAIRoute } from "@/lib/ai/route";

export async function POST(req: Request) {
  const ctx = await startNoteAIRoute<{ noteId?: string; content?: string; title?: string }>(req);
  if (ctx.response) return ctx.response;
  const { body, content } = ctx;
  const title = ctx.title ?? body.title?.trim() ?? "Note";

  if (!content) return jsonError("Content is required to summarize.", 400);
  if (content.length < 20) return jsonError("Content is too short to summarize.", 400);

  const system = "You are a study assistant. Summarize notes into clear bullet points, key takeaways, and a one-paragraph summary. Keep it concise and student-friendly.";
  const prompt = `Summarize this note titled "${title}":\n\n${content.slice(0, 6000)}\n\nProvide: 1) 3-5 bullet key points 2) One-paragraph summary`;

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;
  return NextResponse.json({ success: true, data: { summary: ai.text, title } });
}
