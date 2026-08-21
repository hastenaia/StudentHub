import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { topic?: string; courseId?: string; durationDays?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 }); }

  const topic = body.topic?.trim();
  if (!topic) return NextResponse.json({ success: false, message: "Topic is required." }, { status: 400 });

  const duration = Math.min(Math.max(body.durationDays ?? 7, 1), 30);

  // Gather context: courses and recent tasks for personalization (optional)
  let courseName: string | null = null;
  if (body.courseId) {
    const { data } = await supabase.from("courses").select("name, course_name").eq("id", body.courseId).eq("user_id", user.id).single();
    if (data) courseName = (data as { course_name?: string | null; name: string }).course_name ?? data.name;
  }

  const system = "You are a study planner. Create a concise, actionable study plan with daily breakdown, focus tips, and review checkpoints. Use bullet points and clear headings.";
  const prompt = `Create a ${duration}-day study plan for topic: "${topic}"${courseName ? ` (course: ${courseName})` : ""}. Include daily goals (30-90 min), resources to review, practice tasks, and a final review day. Keep it under 400 words.`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }

  return NextResponse.json({ success: true, data: { plan: result.text, topic, durationDays: duration } });
}
