import { NextResponse } from "next/server";
import { invalidAIJson, jsonError, runAI, startNoteAIRoute, tryParseAIJson } from "@/lib/ai/route";
import { readAiCache, writeAiCache } from "@/lib/ai/cache";
import { aiCacheKey, aiCacheLabel } from "@/lib/ai/cacheKey";

type Card = { front: string; back: string };

export async function POST(req: Request) {
  const ctx = await startNoteAIRoute<{ noteId?: string; content?: string; count?: number; courseId?: string; refresh?: boolean }>(req);
  if (ctx.response) return ctx.response;
  const { body, content } = ctx;
  if (!content || content.length < 30) return jsonError("Provide note content (at least 30 chars) to generate flashcards.", 400);

  const count = Math.min(Math.max(body.count ?? 5, 1), 10);
  // Same slice feeds the cache key and the prompt, so an identical ask always hits the same entry.
  const source = content.slice(0, 6000);
  const label = aiCacheLabel("flashcards", ctx.title ?? "Pasted content");
  const key = aiCacheKey("flashcards", { content: source, count });
  // `refresh` is Regenerate: skip the lookup but still overwrite the stored answer below.
  if (!body.refresh) {
    const hit = await readAiCache(ctx.supabase, ctx.userId, key);
    if (hit) return NextResponse.json({ success: true, data: hit, cached: true });
  }

  const system = "You are a flashcard generator for students. Create concise, clear flashcards. Return ONLY valid JSON array with no markdown fences. Each item: {\"front\": \"question\", \"back\": \"answer\"}. Keep front under 120 chars, back under 300 chars.";
  const prompt = `From this note, generate ${count} flashcards as JSON array:\n\n${source}\n\nReturn JSON only.`;

  const ai = await runAI(prompt, system, { json: true });
  if (ai.response) return ai.response;

  const parsed = tryParseAIJson(ai.text, (v) => (Array.isArray(v) ? (v as Card[]).filter((x) => x.front && x.back).slice(0, count) : null));
  if (!parsed) return invalidAIJson(ai.text);
  if (parsed.length === 0) return jsonError("Could not parse flashcards from AI response.", 502);

  const data = { flashcards: parsed };
  await writeAiCache(ctx.supabase, ctx.userId, key, "flashcards", label, data);
  return NextResponse.json({ success: true, data, cached: false });
}
