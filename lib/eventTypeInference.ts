import type { ScheduleEventType } from "@/types/schedule";

export const EVENT_TYPE_KEYWORDS: Record<ScheduleEventType, string[]> = {
  exam: [
    "exam",
    "midterm",
    "final",
    "quiz",
    "test",
    "assessment",
    "practical",
  ],
  assignment: [
    "assignment",
    "homework",
    "hw",
    "due",
    "deadline",
    "problem set",
    "pset",
    "essay",
    "project",
    "lab report",
    "write up",
    "writeup",
    "submission",
    "submit",
    "reading",
    "worksheet",
  ],
  class: [
    "class",
    "lecture",
    "seminar",
    "lab",
    "tutorial",
    "workshop",
    "recitation",
    "discussion",
  ],
  personal: [
    "gym",
    "workout",
    "dentist",
    "doctor",
    "appointment",
    "birthday",
    "party",
    "family",
    "dinner",
    "lunch",
    "coffee",
    "haircut",
    "laundry",
    "errand",
    "personal",
  ],
  study_session: ["study", "revision", "review", "cram", "practice"],
  other: [],
};

/**
 * First match wins, so the order encodes priority: an explicit exam or deadline
 * beats a generic "class", which beats a personal keyword. "lab report" is
 * checked before "lab" for the same reason.
 */
const PRECEDENCE: ScheduleEventType[] = [
  "exam",
  "assignment",
  "class",
  "personal",
  "study_session",
  "other",
];

export interface EventTypeSuggestion {
  type: ScheduleEventType;
  matched: string | null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary match so "class" never fires on "classic" or "reclassify". */
function findKeyword(haystack: string, keyword: string): boolean {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, "i");
  return pattern.test(haystack);
}

/**
 * Best-guess type from an event title (and optionally its description).
 * Returns the keyword that fired so callers can explain the guess.
 */
export function inferEventType(
  title: string,
  description?: string | null
): EventTypeSuggestion {
  const haystack = `${title ?? ""} ${description ?? ""}`.trim().toLowerCase();
  if (!haystack) return { type: "other", matched: null };

  for (const type of PRECEDENCE) {
    for (const keyword of EVENT_TYPE_KEYWORDS[type]) {
      if (findKeyword(haystack, keyword)) return { type, matched: keyword };
    }
  }
  return { type: "other", matched: null };
}
