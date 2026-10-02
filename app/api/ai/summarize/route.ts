import { NextResponse } from "next/server";
import { jsonError, runAI, startNoteAIRoute } from "@/lib/ai/route";
import { readAiCache, writeAiCache } from "@/lib/ai/cache";
import { aiCacheKey, aiCacheLabel } from "@/lib/ai/cacheKey";

export async function POST(req: Request) {
  const ctx = await startNoteAIRoute<{ noteId?: string; content?: string; title?: string; refresh?: boolean }>(req);
  if (ctx.response) return ctx.response;
  const { body, content } = ctx;
  const title = ctx.title ?? body.title?.trim() ?? "Note";

  if (!content) return jsonError("Content is required to summarize.", 400);
  if (content.length < 20) return jsonError("Content is too short to summarize.", 400);

  // Same slice feeds the cache key and the prompt, so an identical ask always hits the same entry.
  const source = content.slice(0, 6000);
  const label = aiCacheLabel("summarize", title);
  const key = aiCacheKey("summarize", { content: source, title });
  // `refresh` is Regenerate: skip the lookup but still overwrite the stored answer below.
  if (!body.refresh) {
    const hit = await readAiCache(ctx.supabase, ctx.userId, key);
    if (hit) return NextResponse.json({ success: true, data: hit, cached: true });
  }

  const system = "You are a study assistant. Summarize notes into clear bullet points, key takeaways, and a one-paragraph summary. Keep it concise and student-friendly.";
  const prompt = `Summarize this note titled "${title}":\n\n${source}\n\nProvide: 1) 3-5 bullet key points 2) One-paragraph summary`;

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;

  const data = { summary: ai.text, title };
  await writeAiCache(ctx.supabase, ctx.userId, key, "summarize", label, data);
  return NextResponse.json({ success: true, data, cached: false });
}
