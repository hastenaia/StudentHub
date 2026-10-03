# Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers (task scheduling, RBAC, request gate, Zod
schemas, view mappers, date/formatting utilities), the security-critical helpers
(Google token encryption, redirect sanitizing, the AI provider call with a
mocked `fetch`), plus hooks, components and a service via Testing Library.
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
| `lib/taskFilters.test.ts` | Task search/status/priority/course filtering, scheduler inputs, reopen/completion helpers, shared `matchesCourseFilter`, `withXpToast` |
| `lib/authGate.test.ts` | Request-gate rules: auth-link rescue (incl. `/api/*` and `/login?error` exclusions), sign-in redirect, public routes, first-login password change |
| `lib/notesForm.test.ts` | Note PDF-attachment link helpers (pending/unlinked attachments, link stripping, PDF validation, storage keys), Markdown selection wrapping, note ↔ form mapping, Study Hub note search/filters |
| `lib/views.test.ts` | Row → view mappers: `courseView`, `taskView` (+ `taskToDraft`), `scheduleView` / `calendarRowToView` fallbacks and Google type inference, `eventTypeStyle` colour precedence, `relativeLuminance` / `contrastRatio` / `readableTextColor` (custom-colour chip text contrast), `countEventSources` per-source tally (a task deadline must not land in the user count), `viewRange` month-grid padding / week / day / unclipped agenda, `stepPeriod` per-view stepping + no mutation of the input date, `viewHeaderLabel` per view |
| `lib/eventTypeInference.test.ts` | Schedule event-type keyword inference: per-type matches, case/punctuation tolerance, word boundaries, precedence, reported keyword |
| `lib/noteView.test.ts` | Notes row → view mapping, draft → column payload (omitted category left alone), orphan PDF detection |
| `lib/flashcardView.test.ts` | Flashcard row → view mapping, form ↔ draft, write payloads and review counters, filters, study deck, known %, deck wrap-around |
| `lib/quizView.test.ts` | Quiz + question row mapping (position order, grouping), form → draft → question rows, grading, filters |
| `lib/google/crypto.test.ts` | AES-256-GCM token encryption: round-trip, per-call IV, tamper and wrong-key rejection, missing key |
| `lib/ai/provider.test.ts` | `callAI` with mocked `fetch`: provider priority, unconfigured error, empty env vars treated as unset, HTTP/empty/timeout errors |
| `lib/ai/route.test.ts` | `tryParseAIJson` fence stripping and shape validation |
| `lib/supabase/authRedirect.test.ts` | OTP verify + error redirects (Supabase client mocked); off-site `next` always falls back |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, signup, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Manual course Zod schema |
| `lib/validations/tasks.test.ts` | `taskFormSchema`, `taskFormToDraft`, `toLocalInputValue` |
| `lib/validations/courses.test.ts` | Course schema: required/trimmed name, field length limits, palette colors |
| `lib/validations/schedule.test.ts` | Event schema: required fields, event types, end-after-start, length limits; draft ↔ form mapping (09:00–10:00 default on a picked date) |
| `lib/validations/wellness.test.ts` | Mood 1–5 and journal length |
| `lib/theme.test.ts` | Theme resolution (`system` vs stored light/dark), the `data-theme` attribute, localStorage read/write, cross-tab `storage` events |
| `components/layout/Navbar.test.tsx` | Theme toggle: Sun/Moon icons by active theme, toggling light↔dark, switching back to system |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `components/study/MarkdownPreview.test.ts` | Markdown link scheme allow-list, attribute escaping, formatting inside URLs |
| `hooks/useSchedule.test.ts` | `useScheduleDialogs` open/close transitions per source (task and Google refused by `openEdit`, create-date prefill, `dismissAll`), `useFilteredEvents` overlap-not-just-start filtering, boundary spanning, start-order sorting, agenda non-clipping, month-grid overflow, unparseable timestamps; `viewRange` / `stepPeriod` / `viewHeaderLabel` period arithmetic including the pinned `setMonth` overflow behaviour |
| `hooks/hooks.test.tsx` | `useGroupedEvents` day/hour bucketing and memoization, plus `byDaySpan` multi-day expansion (repeats per day, exclusive end, range clamp, all-day flag); `useEscapeKey` activation and cleanup |
| `lib/google/autoSync.test.ts` | Sign-in auto-sync rule: skips unlinked / needs-reconnect / recently synced accounts |
| `lib/noteCategories.test.ts` | Category normalization (trim/collapse/length cap), per-category counts, category + text filtering, string category filters, bulk rename |
| `components/study/NoteCategoryFilter.test.tsx` | Study Hub category filter: selection, rename (normalized, unchanged skipped, failure keeps form), stale rename reset, confirmed remove |
| `components/study/NoteEditorDialog.test.tsx` | Study Hub note editor (service mocked): create/update with course names, failed save, attachment-save warning, PDF attach/remove, toolbar formatting, close behaviour |
| `components/study/NoteParts.test.tsx` | `NoteCard` chips and actions, `NotesFilterBar` filter patches and Clear, `NoteViewDialog` attachment link resolution |
| `hooks/useNoteAttachments.test.tsx` | Note PDF lifecycle (service mocked): load, validation, upload failures, commit links kept / discards dropped / prunes unlinked, discard on unmount |
| `components/tasks/TasksParts.test.tsx` | `TaskViewToggle`, `TasksToolbar` filter patches / clear / sort / match count, `TasksContent` empty states and board vs list |
| `components/study/FlashcardParts.test.tsx` | `FlashcardCard`, `FlashcardStudy` flip / advance / wrap / failed mark, `FlashcardDialog` create/update/failure (service mocked) |
| `components/schedule/scheduleViews.test.tsx` | Multi-view calendar consistency: `EventChip` colour/contrast/Google + task markers/keyboard activation, `EventEmptyState` copy per view, month overflow + multi-day repeat, week all-day lane + other-times strip, day all-day lane + carry-over from the previous day, agenda grouping/ordering/single-occurrence, task deadlines (month cell, week all-day lane, day/agenda "Due <time>", assignment colour, tooltip, click-through), one event coloured identically in all four views |
| `components/schedule/EventDetailDialog.test.tsx` | Detail dialog per source: type chip + time range, Edit/Delete offered and wired for `user`, course name and "No course" fallback, Google and task deadlines read-only with their explanation, task due time shown under "Due", no accidental mutation for a read-only event, all-day labelling, location/description shown only when present, close via button and dismiss control |
| `services/schedule.service.test.ts` | `getScheduleData` (Supabase stubbed): user + Google merge and ordering, per-source event typing, course options, `default_calendar_view` honoured and validated, task deadlines derived and merged in start order with completed/undated tasks dropped, empty-table fallbacks |
| `lib/taskSchedule.test.ts` | `tasksToScheduleEvents`: null `due_at` and `done` skipped, unparseable dates skipped, `task:` id namespace, `assignment` type, course passthrough, `color` stays null, exact due instant preserved, one local day touched (incl. late-evening and month roll), `endAt > startAt`, and DST spring-forward/fall-back day stepping (skipped on runners whose zone has no DST, so they can't pass vacuously) |
| `components/study/QuizParts.test.tsx` | `QuizPlayer` answer inputs per type, `QuizReview` summary, `QuizCard`, `QuizDialog` create / add-remove questions / failure (service mocked) |
| `utils/text.test.ts` | `parseTags` and `upsertById` |
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
- **Theme**: `lib/theme.ts` resolves `system` against the OS preference and is
  driven by `useSyncExternalStore`, so the toggle, the pre-paint bootstrap, and
  cross-tab `storage` events all share one tested source of truth.

## Coverage notes

The service layer (`services/*`), most route handlers, and most React components
are not unit-tested; the pure functions they depend on are. When changing a
component, prefer moving its logic into a pure `lib/*.ts` module and testing that.
`fallow health --coverage-gaps` lists runtime files no test reaches.
