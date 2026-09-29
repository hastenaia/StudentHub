import { NextResponse } from "next/server";
import { jsonError, runAI, startAIRoute } from "@/lib/ai/route";

export async function POST(req: Request) {
  const ctx = await startAIRoute<{ topic?: string; courseId?: string; durationDays?: number }>(req);
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

  const ai = await runAI(prompt, system);
  if (ai.response) return ai.response;

  return NextResponse.json({ success: true, data: { plan: ai.text, topic, durationDays: duration } });
}
