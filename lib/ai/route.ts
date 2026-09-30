import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/provider";

// Shared plumbing for app/api/ai/* route handlers.

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/** Authenticates the caller and parses the JSON body, or returns the 401/400 response to send. */
export async function startAIRoute<B>(
  req: Request
): Promise<{ supabase: ServerClient; user: User; body: B; response?: never } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: jsonError("Not authenticated.", 401) };
  try {
    return { supabase, user, body: (await req.json()) as B };
  } catch {
    return { response: jsonError("Invalid JSON.", 400) };
  }
}

/**
 * `startAIRoute` + `resolveNoteSource` for the note-based generators (summarize, flashcards, quiz):
 * returns the parsed body plus the source text and note title, or the error response to send.
 */
export async function startNoteAIRoute<B extends { noteId?: string; content?: string }>(
  req: Request
): Promise<{ body: B; content: string | undefined; title: string | null; response?: never } | { response: NextResponse }> {
  const ctx = await startAIRoute<B>(req);
  if (ctx.response) return ctx;
  const source = await resolveNoteSource(ctx.supabase, ctx.user.id, ctx.body);
  if (source.response) return source;
  return { body: ctx.body, content: source.content, title: source.title };
}

/** Calls the configured provider; on failure returns 503 (unconfigured) or 502 (provider error/timeout). */
export async function runAI(prompt: string, system: string): Promise<{ text: string; response?: never } | { response: NextResponse }> {
  const result = await callAI(prompt, system);
  if ("error" in result) {
    return { response: jsonError(result.error, result.error.includes("not configured") ? 503 : 502) };
  }
  return { text: result.text };
}

/**
 * Source text for note-based generators: the caller's own note when `noteId` is given (RLS + explicit
 * user filter), otherwise the pasted `content`. Returns a 404 response when the note isn't theirs.
 */
async function resolveNoteSource(
  supabase: ServerClient,
  userId: string,
  body: { noteId?: string; content?: string }
): Promise<{ content: string | undefined; title: string | null; response?: never } | { response: NextResponse }> {
  if (!body.noteId) return { content: body.content?.trim(), title: null };
  const { data: note } = await supabase.from("notes").select("title, content").eq("id", body.noteId).eq("user_id", userId).single();
  if (!note) return { response: jsonError("Note not found.", 404) };
  return { content: note.content ?? "", title: note.title };
}

/**
 * Parses model output that should be JSON (tolerating ```json fences) and hands it to `validate`.
 * Returns null when the text isn't JSON or `validate` rejects it.
 */
export function tryParseAIJson<T>(text: string, validate: (value: unknown) => T | null): T | null {
  try {
    return validate(JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim()));
  } catch {
    return null;
  }
}

export function invalidAIJson(text: string) {
  return jsonError("AI returned invalid JSON. Raw: " + text.slice(0, 500), 502);
}
