import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  let body: { concept?: string; courseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }
  const concept = body.concept?.trim();
  if (!concept) return NextResponse.json({ success: false, message: "Concept is required." }, { status: 400 });

  const system = "You are a friendly study assistant for university students. Explain concepts clearly with examples, bullet points, and simple language. Keep it concise but thorough.";
  const prompt = `Explain this concept for a student: "${concept}"${body.courseId ? " (related to their course)" : ""}. Use clear headings and examples.`;

  const result = await callAI(prompt, system);
  if ("error" in result) {
    const isConfig = result.error.includes("not configured");
    return NextResponse.json({ success: false, message: result.error }, { status: isConfig ? 503 : 502 });
  }
  return NextResponse.json({ success: true, data: { explanation: result.text } });
}
