# Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers (task scheduling, RBAC, request gate, Zod
schemas, view mappers, date/formatting utilities), the security-critical helpers
(Google token encryption, redirect sanitizing, the AI provider call with a
mocked `fetch`), plus a few hooks and one component via Testing Library.
Files that need Node's crypto or `Response` opt into `// @vitest-environment node`.

## Running tests

```bash
npm test                                  # run once (vitest run)
npm run test:watch                        # watch mode
npx vitest run lib/scheduling.test.ts     # a single file
npx vitest run -t "nextRecurrence"        # tests whose name matches
```

## Configuration

| File | Purpose |
|---|---|
| `vitest.config.mts` | `jsdom` environment, `@` → repo root alias, globals, setup file, includes `**/*.test.{ts,tsx}` |
| `vitest.setup.ts` | Imports `@testing-library/jest-dom/vitest` (custom matchers) |

## Test files

| File | Area under test |
|---|---|
| `lib/scheduling.test.ts` | `buildSchedule` scored ordering, `buildTopSchedule` heap Top-K, `nextRecurrence`, `formatRecurrenceLabel` |
| `lib/gamification.test.ts` | Levels (100 XP each), timezone date, lapsed-streak display, profile → view mapping, award payload parsing, XP toast text |
| `lib/progress.test.ts` | Weighted 0–100 course score (`courseProgress`, `projectedProgress`, `progressByCourse`): null/no-graded, weights, unscorable rows, clamping |
| `lib/google/assignmentRows.test.ts` | Classroom courseWork + own submission → `assignments` rows: grade/max points, submitted states, keeps stored grades when submissions fail |
| `lib/dates.test.ts` | `startOfDay`/`endOfDay`, `toDateStr`, `computeStreak` |
| `lib/wellness.test.ts` | Weekly mood points, today's activity/deadline counts, workload suggestion rules |
| `lib/aiRequests.test.ts` | AI tab request building per action (validation, note vs pasted text, count defaults) and result text |
| `lib/taskSort.test.ts` | Task list sort modes (smart, deadline, priority, effort, created); done tasks sink |
| `lib/authGate.test.ts` | Request-gate rules: auth-link rescue (incl. `/api/*` and `/login?error` exclusions), sign-in redirect, public routes, first-login password change |
| `lib/notesForm.test.ts` | Note PDF-attachment link helpers (pending/unlinked attachments, link stripping) |
| `lib/views.test.ts` | Row → view mappers: `courseView`, `taskView` (+ `taskToDraft`), `scheduleView` / `calendarRowToView` fallbacks |
| `lib/google/crypto.test.ts` | AES-256-GCM token encryption: round-trip, per-call IV, tamper and wrong-key rejection, missing key |
| `lib/ai/provider.test.ts` | `callAI` with mocked `fetch`: provider priority, unconfigured error, empty env vars treated as unset, HTTP/empty/timeout errors |
| `lib/ai/route.test.ts` | `tryParseAIJson` fence stripping and shape validation |
| `lib/supabase/authRedirect.test.ts` | OTP verify + error redirects (Supabase client mocked); off-site `next` always falls back |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, signup, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Manual course Zod schema |
| `lib/validations/tasks.test.ts` | `taskFormSchema`, `taskFormToDraft`, `toLocalInputValue` |
| `lib/validations/courses.test.ts` | Course schema: required/trimmed name, field length limits, palette colors |
| `lib/validations/schedule.test.ts` | Event schema: required fields, event types, end-after-start, length limits |
| `lib/validations/wellness.test.ts` | Mood 1–5 and journal length |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `components/study/MarkdownPreview.test.ts` | Markdown link scheme allow-list, attribute escaping, formatting inside URLs |
| `hooks/hooks.test.tsx` | `useGroupedEvents` day/hour bucketing and memoization; `useEscapeKey` activation and cleanup |
| `components/notes/AiAssistantPanel.test.tsx` | Mock quiz reaches "Quiz complete" with the right score and can retry (regression) |
| `utils/cn.test.ts` | `cn()` class-name merging |
| `utils/date.test.ts` | Date formatters with a fixed clock (incl. due-day labels for late-in-day times) and `trimOrNull` |
| `utils/safeRedirect.test.ts` | Open-redirect prevention in redirect targets (incl. backslash / control-character bypasses) |
| `utils/validation.test.ts` | Email validation, password strength rules, initials helper |

## What the tests verify

- **Scheduling**: the Suggested Order heap (overdue first, then by due date,
  ties broken by priority then effort, undated tasks last) and recurrence date
  math (intervals, month-end clamping, `recurUntil`) are deterministic, side-effect-free
  functions in `lib/scheduling.ts`, so they're verified without Supabase.
- **RBAC**: the role-ranking rules, role resolution defaults, and the
  longest-prefix route access lookup.
- **Zod schemas**: form validation boundaries (email format, password policy,
  credit-hour ranges, task fields, required fields) and form → draft mapping.
- **Error mapping**: Supabase auth errors map to friendly messages, with a
  generic fallback.
- **Utilities**: class merging and open-redirect protection.

## Coverage notes

The service layer (`services/*`), most route handlers, and most React components
are not unit-tested; the pure functions they depend on are. When changing a
component, prefer moving its logic into a pure `lib/*.ts` module and testing that.
`fallow health --coverage-gaps` lists runtime files no test reaches.
