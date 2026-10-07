import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";

const MAX_QUESTION_CHARS = 1000;

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ question?: unknown }>(req);
  if (ctx.response) return ctx.response;

  const question = typeof ctx.body.question === "string" ? ctx.body.question.trim() : "";
  if (!question) return jsonError("Question is required.", 400);
  if (question.length > MAX_QUESTION_CHARS) return jsonError(`Question must be at most ${MAX_QUESTION_CHARS} characters.`, 400);

  const system = "You are a friendly study assistant inside a student planner app. Give practical, concise answers with short bullet points where helpful. Do not invent facts about the student's own tasks or courses.";
  const ai = await runAI(question, system);
  if (ai.response) return ai.response;
  return NextResponse.json({ success: true, data: { answer: ai.text } });
}
