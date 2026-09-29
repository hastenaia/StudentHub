import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";

const MAX_TIP_CHARS = 220;

const clampInt = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : null);

/** Collapses the model's reply to one plain-text sentence for the small WorkloadCard box. */
function toOneSentence(text: string): string {
  const plain = text
    .replace(/[#*_`>]+/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const first = plain.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? plain;
  return first.length > MAX_TIP_CHARS ? `${first.slice(0, MAX_TIP_CHARS - 1).trimEnd()}…` : first;
}

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ focusMinutesToday?: unknown; upcomingDeadlinesCount?: unknown }>(req);
  if (ctx.response) return ctx.response;
  const { body } = ctx;

  const focus = clampInt(body.focusMinutesToday, 24 * 60);
  const deadlines = clampInt(body.upcomingDeadlinesCount, 1000);
  if (focus === null || deadlines === null) {
    return jsonError("focusMinutesToday and upcomingDeadlinesCount must be numbers.", 400);
  }

  const system = "You are a supportive student wellness coach. Reply with exactly one short, practical sentence in plain text: no markdown, no lists, no headings, no medical advice.";
  const prompt = `A student has focused for ${focus} minutes today and has ${deadlines} upcoming deadlines. Suggest one specific break or pacing tip.`;

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;
  const tip = toOneSentence(ai.text);
  if (!tip) return jsonError("AI returned an empty tip.", 502);
  return NextResponse.json({ success: true, data: { tip } });
}
