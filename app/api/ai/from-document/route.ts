import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, runAI, tryParseAIJson } from "@/lib/ai/route";
import { readAiCache, writeAiCache } from "@/lib/ai/cache";
import { aiCacheKey, aiCacheLabel } from "@/lib/ai/cacheKey";
import {
  clampFlashcardCount,
  defaultTitleFromFilename,
  detectDocumentKind,
  prepareSource,
  validateDocumentFile,
  MIN_FLASHCARDS_CHARS,
  MIN_SUMMARY_CHARS,
  type DocumentKind,
} from "@/lib/documentText";
import { flashcardDraftToColumns, flashcardRowToView } from "@/lib/flashcardView";
import { noteDraftToColumns, noteRowToView } from "@/lib/noteView";

type Card = { front: string; back: string };

const SUMMARY_SYSTEM =
  "You are a study assistant. Summarize notes into clear bullet points, key takeaways, and a one-paragraph summary. Keep it concise and student-friendly.";
const FLASHCARDS_SYSTEM =
  'You are a flashcard generator for students. Create concise, clear flashcards. Return ONLY valid JSON array with no markdown fences. Each item: {"front": "question", "back": "answer"}. Keep front under 120 chars, back under 300 chars.';

/** Raw text from an uploaded file. Binary parsing stays in this route; validation lives in lib/. */
async function extractDocumentText(kind: DocumentKind, file: File): Promise<string | null> {
  try {
    if (kind === "txt" || kind === "md") return await file.text();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (kind === "docx") {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({ buffer });
      return value ?? "";
    }
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer));
    return Array.isArray(text) ? text.join("\n") : (text ?? "");
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.warn("[from-document] extract failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Not authenticated.", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid upload.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a file to import.", 400);
  const invalid = validateDocumentFile({ name: file.name, type: file.type, size: file.size });
  if (invalid) return jsonError(invalid, 400);
  const kind = detectDocumentKind(file.name, file.type);
  if (!kind) return jsonError("Unsupported file type.", 400);

  const rawTitle = String(form.get("title") ?? "").trim();
  const title = (rawTitle || defaultTitleFromFilename(file.name)).slice(0, 120);
  const makeFlashcards = String(form.get("makeFlashcards") ?? "true") !== "false";
  const count = clampFlashcardCount(String(form.get("count") ?? "5"));
  const refresh = String(form.get("refresh") ?? "") === "true";

  const rawText = await extractDocumentText(kind, file);
  if (rawText === null) return jsonError("Could not read that file. Try another file.", 422);
  // Same slice feeds the cache keys and the prompts, so an identical file always hits the same entries.
  const source = prepareSource(rawText);
  if (source.length < MIN_SUMMARY_CHARS)
    return jsonError("Could not extract enough text from that file (is it scanned images?).", 422);
  if (makeFlashcards && source.length < MIN_FLASHCARDS_CHARS)
    return jsonError("Not enough text for flashcards — try a longer document.", 422);

  // Resolve the course only when it belongs to the caller; otherwise the note is course-free.
  const rawCourseId = String(form.get("courseId") ?? "").trim() || null;
  let courseId: string | null = null;
  let courseName: string | null = null;
  let courseColor: string | null = null;
  if (rawCourseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id, name, color")
      .eq("id", rawCourseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (course) {
      courseId = course.id;
      courseName = course.name;
      courseColor = course.color;
    }
  }
  const courseMap = courseId
    ? new Map([[courseId, { name: courseName ?? "Course", color: courseColor }]])
    : new Map();

  const summaryKey = aiCacheKey("summarize", { content: source, title });
  const cardsKey = aiCacheKey("flashcards", { content: source, count });
  let summaryText: string | null = null;
  let cards: Card[] = [];
  let cached = false;

  if (!refresh) {
    const [summaryHit, cardsHit] = await Promise.all([
      readAiCache(supabase, user.id, summaryKey),
      makeFlashcards ? readAiCache(supabase, user.id, cardsKey) : Promise.resolve(null),
    ]);
    const summary = (summaryHit?.summary as string | undefined) ?? null;
    const hitCards = Array.isArray((cardsHit as { flashcards?: unknown } | null)?.flashcards)
      ? (cardsHit as { flashcards: Card[] }).flashcards.filter((c) => c.front && c.back).slice(0, count)
      : [];
    // A partial hit (summary without cards) still saves a provider call for the half that hit.
    if (summary && (!makeFlashcards || hitCards.length > 0)) {
      summaryText = summary;
      cards = hitCards;
      cached = true;
    } else if (summary) {
      summaryText = summary;
      cached = true;
    }
  }

  if (!summaryText) {
    const ai = await runAI(
      `Summarize this document titled "${title}":\n\n${source}\n\nProvide: 1) 3-5 bullet key points 2) One-paragraph summary`,
      SUMMARY_SYSTEM
    );
    if (ai.response) return ai.response;
    summaryText = ai.text;
    await writeAiCache(supabase, user.id, summaryKey, "summarize", aiCacheLabel("summarize", title), {
      summary: summaryText,
      title,
    });
  }

  if (makeFlashcards && cards.length === 0) {
    const ai = await runAI(
      `From this document, generate ${count} flashcards as JSON array:\n\n${source}\n\nReturn JSON only.`,
      FLASHCARDS_SYSTEM,
      { json: true }
    );
    if (ai.response) return ai.response;
    const parsed = tryParseAIJson(
      ai.text,
      (v) => (Array.isArray(v) ? (v as Card[]).filter((x) => x.front && x.back).slice(0, count) : null)
    );
    if (!parsed || parsed.length === 0)
      return jsonError("Could not parse flashcards from AI response.", 502);
    cards = parsed;
    await writeAiCache(
      supabase,
      user.id,
      cardsKey,
      "flashcards",
      aiCacheLabel("flashcards", title),
      { flashcards: cards }
    );
  }

  const { data: noteRow, error: noteError } = await supabase
    .from("notes")
    .insert({
      ...noteDraftToColumns({
        title,
        content: summaryText.slice(0, 10000),
        tags: ["imported"],
        courseId,
        category: null,
      }),
      user_id: user.id,
    })
    .select()
    .single();
  if (noteError || !noteRow) return jsonError(noteError?.message ?? "Could not save the note.", 500);

  let cardRows: Parameters<typeof flashcardRowToView>[0][] = [];
  if (cards.length > 0) {
    const { data, error } = await supabase
      .from("flashcards")
      .insert(
        cards.map((c) =>
          ({
            ...flashcardDraftToColumns({ front: c.front, back: c.back, tags: [], courseId, noteId: noteRow.id }),
            user_id: user.id,
          })
        )
      )
      .select();
    if (error) return jsonError(error.message, 500);
    cardRows = data ?? [];
  }

  return NextResponse.json({
    success: true,
    data: {
      note: noteRowToView(noteRow, courseMap),
      flashcards: cardRows.map((r) => flashcardRowToView(r, courseMap)),
      summary: summaryText,
    },
    cached,
  });
}
