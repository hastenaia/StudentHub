// Cache fingerprints for persisted AI answers. Node-only (crypto); used by the app/api/ai/* handlers.
import { createHash } from "node:crypto";
import type { AIAction } from "@/lib/aiRequests";

/** Bump when prompts or response shapes change so previously stored answers stop being served. */
const CACHE_VERSION = 1;

/** JSON with object keys sorted recursively, so key order can never cause a false cache miss. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonicalize(v)])
    );
  }
  return value;
}

/**
 * Fingerprint of one AI request: version + action + the inputs actually sent to the model. Identical
 * inputs always produce the same key, so a repeated ask is served from `ai_cache` with no provider call.
 */
export function aiCacheKey(action: AIAction, input: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify([CACHE_VERSION, action, canonicalize(input)])).digest("hex");
}

/** Short history label for a request — falls back to the action name when there is no text. */
export function aiCacheLabel(action: AIAction, primary: string): string {
  const text = primary.trim().replace(/\s+/g, " ");
  if (!text) return action;
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}
