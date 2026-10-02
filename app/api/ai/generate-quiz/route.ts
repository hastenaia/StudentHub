import { NextResponse } from "next/server";
import { invalidAIJson, jsonError, runAI, startNoteAIRoute, tryParseAIJson } from "@/lib/ai/route";

type QuizJson = { questions: unknown[] };
const asQuiz = (v: unknown): QuizJson | null => (Array.isArray((v as Partial<QuizJson> | null)?.questions) ? (v as QuizJson) : null);

export async function POST(req: Request) {
  const ctx = await startNoteAIRoute<{ noteId?: string; content?: string; count?: number; courseId?: string; title?: string }>(req);
  if (ctx.response) return ctx.response;
  const { body, content } = ctx;
  const title = body.title ?? ctx.title;
  if (!content || content.length < 30) return jsonError("Provide content to generate quiz.", 400);

  const count = Math.min(Math.max(body.count ?? 5, 1), 8);
  const system = `You are a quiz generator. Return ONLY valid JSON with no markdown fences. Structure: {"questions": [{"question_text":"...", "question_type":"multiple_choice|true_false|short_answer", "options":["A","B","C","D"] (only for multiple_choice), "correct_answer":"...", "explanation":"..."}]}. For multiple_choice, provide 4 options and correct_answer must be one of them. For true_false, correct_answer is "True" or "False". Keep questions clear.`;
  const prompt = `From this note titled "${title ?? "Study material"}", generate ${count} quiz questions as JSON:\n\n${content.slice(0, 6000)}`;

  const ai = await runAI(prompt, system, { json: true });
  if (ai.response) return ai.response;

  const parsed = tryParseAIJson(ai.text, asQuiz);
  if (!parsed) return invalidAIJson(ai.text);

  return NextResponse.json({ success: true, data: parsed });
}
