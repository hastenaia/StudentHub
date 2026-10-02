import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";
import { readAiCache, writeAiCache } from "@/lib/ai/cache";
import { aiCacheKey, aiCacheLabel } from "@/lib/ai/cacheKey";

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ topic?: string; courseId?: string; durationDays?: number; refresh?: boolean }>(req);
  if (ctx.response) return ctx.response;
  const { supabase, user, body } = ctx;

  const topic = body.topic?.trim();
  if (!topic) return jsonError("Topic is required.", 400);

  const duration = Math.min(Math.max(body.durationDays ?? 7, 1), 30);

  // Gather context: courses and recent tasks for personalization (optional)
  let courseName: string | null = null;
  if (body.courseId) {
    const { data } = await supabase.from("courses").select("name, course_name").eq("id", body.courseId).eq("user_id", user.id).single();
    if (data) courseName = (data as { course_name?: string | null; name: string }).course_name ?? data.name;
  }

  const system = "You are a study planner. Create a concise, actionable study plan with daily breakdown, focus tips, and review checkpoints. Use bullet points and clear headings.";
  const prompt = `Create a ${duration}-day study plan for topic: "${topic}"${courseName ? ` (course: ${courseName})` : ""}. Include daily goals (30-90 min), resources to review, practice tasks, and a final review day. Keep it under 400 words.`;

  // Keyed on what the prompt actually contains, so a renamed course produces a fresh plan.
  const key = aiCacheKey("plan", { topic, duration, courseName });
  // `refresh` is Regenerate: skip the lookup but still overwrite the stored answer below.
  if (!body.refresh) {
    const hit = await readAiCache(supabase, user.id, key);
    if (hit) return NextResponse.json({ success: true, data: hit, cached: true });
  }

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;

  const label = aiCacheLabel("plan", topic);
  const data = { plan: ai.text, topic, durationDays: duration };
  await writeAiCache(supabase, user.id, key, "plan", label, data);
  return NextResponse.json({ success: true, data, cached: false });
}
