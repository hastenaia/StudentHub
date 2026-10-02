import type { Database } from "@/types/database.types";
import type { AICachedResult, AIAction } from "@/types/study";

type AiCacheRow = Database["public"]["Tables"]["ai_cache"]["Row"];
/** The columns the history query selects — the view model needs nothing else. */
export type AiCacheViewRow = Pick<AiCacheRow, "id" | "action" | "label" | "data" | "created_at">;

const ACTIONS: AIAction[] = ["explain", "summarize", "flashcards", "quiz", "plan"];

/** Map a raw ai_cache row to the UI view model, or null when the stored action is no longer known. */
export function aiCacheRowToView(row: AiCacheViewRow): AICachedResult | null {
  const action = ACTIONS.find((a) => a === row.action);
  if (!action) return null;
  return { id: row.id, action, label: row.label, data: row.data, createdAt: row.created_at };
}

/** Row→view for a history query, skipping rows with an unrecognised action. */
export function aiCacheRowsToView(rows: AiCacheViewRow[]): AICachedResult[] {
  return rows.map(aiCacheRowToView).filter((r): r is AICachedResult => r !== null);
}

/** Compact "when was this asked" label for the history list. */
export function aiCacheAgeLabel(createdAt: string, now: number = Date.now()): string {
  const ms = now - new Date(createdAt).getTime();
  if (!Number.isFinite(ms)) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString();
}
