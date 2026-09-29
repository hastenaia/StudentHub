import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ concept?: string; courseId?: string }>(req);
  if (ctx.response) return ctx.response;
  const { body } = ctx;

  const concept = body.concept?.trim();
  if (!concept) return jsonError("Concept is required.", 400);

  const system = "You are a friendly study assistant for university students. Explain concepts clearly with examples, bullet points, and simple language. Keep it concise but thorough.";
  const prompt = `Explain this concept for a student: "${concept}"${body.courseId ? " (related to their course)" : ""}. Use clear headings and examples.`;

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;
  return NextResponse.json({ success: true, data: { explanation: ai.text } });
}
