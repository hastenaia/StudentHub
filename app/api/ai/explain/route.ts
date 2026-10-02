import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";
import { readAiCache, writeAiCache } from "@/lib/ai/cache";
import { aiCacheKey, aiCacheLabel } from "@/lib/ai/cacheKey";

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ concept?: string; courseId?: string; refresh?: boolean }>(req);
  if (ctx.response) return ctx.response;
  const { body } = ctx;

  const concept = body.concept?.trim();
  if (!concept) return jsonError("Concept is required.", 400);

  const label = aiCacheLabel("explain", concept);
  const key = aiCacheKey("explain", { concept, courseId: body.courseId ?? null });
  // `refresh` is Regenerate: skip the lookup but still overwrite the stored answer below.
  if (!body.refresh) {
    const hit = await readAiCache(ctx.supabase, ctx.user.id, key);
    if (hit) return NextResponse.json({ success: true, data: hit, cached: true });
  }

  const system = "You are a friendly study assistant for university students. Explain concepts clearly with examples, bullet points, and simple language. Keep it concise but thorough.";
  const prompt = `Explain this concept for a student: "${concept}"${body.courseId ? " (related to their course)" : ""}. Use clear headings and examples.`;

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;

  const data = { explanation: ai.text };
  await writeAiCache(ctx.supabase, ctx.user.id, key, "explain", label, data);
  return NextResponse.json({ success: true, data, cached: false });
}
