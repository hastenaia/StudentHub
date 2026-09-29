import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { focusMinutesToday?: unknown; upcomingDeadlinesCount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }
  const focus = clampInt(body.focusMinutesToday, 24 * 60);
  const deadlines = clampInt(body.upcomingDeadlinesCount, 1000);
  if (focus === null || deadlines === null) {
    return NextResponse.json({ success: false, message: "focusMinutesToday and upcomingDeadlinesCount must be numbers." }, { status: 400 });
  }

  const system = "You are a supportive student wellness coach. Reply with exactly one short, practical sentence in plain text: no markdown, no lists, no headings, no medical advice.";
  const prompt = `A student has focused for ${focus} minutes today and has ${deadlines} upcoming deadlines. Suggest one specific break or pacing tip.`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }
  const tip = toOneSentence(result.text);
  if (!tip) return NextResponse.json({ success: false, message: "AI returned an empty tip." }, { status: 502 });
  return NextResponse.json({ success: true, data: { tip } });
}
