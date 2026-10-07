# CHAPTER 7: SYSTEM INTEGRATION TESTING

## 7.1 Integration Test Matrix

System Integration Testing (SIT) validated the data pathways between the Next.js 16 presentation layer (App Router, Server Components, client services), the Next route handlers under `app/api/*`, the request gate (`proxy.ts` → `lib/supabase/middleware.ts` → `lib/authGate.ts`) and Supabase (Auth, PostgreSQL with owner-only RLS, Storage). The tests covered session transport, owner-scoped queries, the Google sync gateway, the AI provider gateway and the AI cache.

> **Evidence basis.** The "Actual Output" column cites the code path and the Vitest file that backs each result. The full suite was run on branch `fix/ui-alignment` (Node v26.10.0, Vitest 4.1.10): **56 test files passed, 530 tests passed, 2 skipped, 0 failed**. `npm run lint` finished with 0 errors and 1 warning (React Compiler skipped `MoodCheckIn.tsx` because React Hook Form's `watch()` can't be memoized). `npm run build` succeeded. All three ran on commit `9b8fa82`. Rows marked **MANUAL** need a live Supabase project, so they follow `docs/qa-checklist.md`.

| Test ID | Modules Integrated | Integration Flow / Description | Expected Output | Actual Output | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **ITC-01** | Auth → Request Gate → Dashboard | An unauthenticated user requests `/dashboard`. `proxy.ts` calls `updateSession`, which calls `auth.getUser()` and applies `sessionRedirect`. | `307` redirect to `/login?redirectTo=%2Fdashboard`. | `lib/authGate.ts` redirects non-`PUBLIC_ROUTES` paths when there is no user (`lib/authGate.test.ts`). | **PASS** |
| **ITC-02** | Auth → Forced Password Change | A first-login user (`user_metadata.must_change_password = true`) opens any dashboard route. | Redirect to `/change-password` before the dashboard loads. | Gate rule verified in `lib/authGate.test.ts`. `authService.changePassword` clears the flag. | **PASS** |
| **ITC-03** | Auth Email Link → `/auth/callback` → Session | A recovery or confirmation link lands on the wrong page with `?code=` or `?token_hash=`. | The gate forwards it to `/auth/callback`. An off-site `next` falls back to a safe path. | `rescueAuthLink` plus `authRedirect` tests (`lib/authGate.test.ts`, `lib/supabase/authRedirect.test.ts`, `utils/safeRedirect.test.ts`). | **PASS** |
| **ITC-04** | Settings → Google OAuth (PKCE) → `google_accounts` | The user connects Google. `/api/google/auth` redirects, `/api/google/callback` exchanges the code and stores encrypted tokens. | Access and refresh tokens are stored AES-256-GCM encrypted. Plaintext never reaches Postgres or the browser. | Crypto round-trip, tamper and wrong-key rejection pass (`lib/google/crypto.test.ts`). The live OAuth consent flow is **MANUAL**. | **PASS** (crypto) / **MANUAL** (OAuth) |
| **ITC-05** | Sync Now → `POST /api/dashboard/sync` → Classroom/Calendar → Cache Tables | A sync upserts courses, assignments, announcements and calendar events. Dashboard pages then read only the cache. | Idempotent upserts keyed on `(user_id, google_*_id)`. A failed sync keeps the existing cache and surfaces a mapped error (429/403/401). | `lib/google/assignmentRows.test.ts` keeps stored grades when submissions fail. `lib/google/autoSync.test.ts` covers the staleness trigger. Live sync is **MANUAL**. | **PASS** (logic) / **MANUAL** (live) |
| **ITC-06** | Tasks UI → `tasksClientService` → `tasks` → Scheduler | A task is created, completed and recurred. The scheduler orders the list. | `buildSchedule` / `buildTopSchedule` return a deterministic scored order. Completing a recurring task produces the next occurrence. XP is awarded once. | `lib/scheduling.test.ts`, `lib/taskSort.test.ts`, `lib/taskFilters.test.ts`, `lib/gamification.test.ts`. | **PASS** |
| **ITC-07** | Study Hub → `/api/ai/*` → `callAI()` → Provider | A request goes to `explain`, `summarize`, `generate-flashcards`, `generate-quiz` or `study-plan`. | The first configured provider answers. With none configured the route returns 503, never fake output. A slow provider fails with "AI timed out". | `lib/ai/provider.test.ts` (provider priority, unconfigured error, empty env treated as unset, HTTP/empty/timeout errors) and `lib/ai/route.test.ts` (JSON fence stripping). | **PASS** |
| **ITC-08** | `/api/ai/*` → `ai_cache` → AI Assistant Tab | The same prompt is asked twice. The second call is served from cache. `refresh: true` forces a re-ask. | The second call returns `cached: true` with no provider call. Editing the source note changes the key and invalidates its answers. | `lib/ai/cache.test.ts`, `lib/ai/cacheKey.test.ts`, `lib/aiCacheView.test.ts`. Migration `20261002000001_ai_cache.sql` has `UNIQUE (user_id, cache_key)` and owner-only RLS. | **PASS** |
| **ITC-09** | Notes → `note_attachments` → Storage `notes-pdfs` → RLS | The user attaches a PDF to a note and another user probes the storage path. | Only the owner can sign URLs under `notes-pdfs/<uid>/`. Orphan attachments are detected on save. | `lib/notesForm.test.ts` and `lib/noteView.test.ts` cover helpers and orphan detection. Cross-user RLS check is **MANUAL** (QA checklist §5). | **PASS** (logic) / **MANUAL** (RLS) |
| **ITC-10** | Profile → Theme Preference → `<html>` Class | The user toggles light, dark or system in the Navbar. The choice persists to `profiles.theme` and across tabs. | The `dark` class and `data-theme` update. `localStorage` stays in sync. The `storage` event updates other tabs. | `lib/theme.test.ts` and `components/layout/Navbar.test.tsx`. | **PASS** |

## 7.2 Regression Verification

To confirm that Sprint 2 and Sprint 3 changes (AI cache, gamification, theming, schedule dialogs) did not reintroduce earlier weaknesses, the Chapter 5 gaps (UTC-02, UTC-05) and the other security-critical cases were re-checked.

### Regression Re-Test Summary

| Original Test ID | Earlier Defect / Gap | Fix Applied | Re-Test Result | Final Status |
| :-- | :-- | :-- | :-- | :-- |
| **UTC-02** | Injection payload cases were not covered by an explicit test. | `loginSchema` (Zod) rejects malformed email before any network call. The Supabase client is parameterized. Errors pass through `getAuthErrorMessage`. | Zod rejects `' OR 1=1 --`. No raw SQL path exists, so there is no 500. | **PASS** |
| **UTC-05** | Session expiry was enforced by design but had no dedicated test. | `auth.getUser()` in the gate returns null → redirect to `/login?redirectTo=`. `useAuth` clears state on `SIGNED_OUT`. | Gate redirect is covered in `lib/authGate.test.ts` (commit `6c3e40d`). The `useAuth` path is covered in `hooks/hooks.test.tsx`. | **PASS** |
| **UTC-07** | Open redirect through `?redirectTo=` / `next`. | `safeRedirect` and `authRedirect` allow same-origin paths only. | Off-site targets fall back to a safe path (`utils/safeRedirect.test.ts`, `lib/supabase/authRedirect.test.ts`). | **PASS** |
| **UTC-04** | Forced password change on first login. | Gate rule in `lib/authGate.ts`. | Redirect to `/change-password` still holds after the gate refactor. | **PASS** |
| **UTC-03** | Invalid password message. | `getAuthErrorMessage` maps `Invalid login credentials`. | Friendly message returned (`lib/supabase/errors.test.ts`). | **PASS** |

## 7.3 Defect Resolution Log

Integration work in Sprints 2 and 3 surfaced the following defects. Each was resolved in the commit named. Entries are taken from the git history and migration notes.

### Integration Defect 1: AI Provider Timeouts and Single-Model Failure (`ITC-DEF-01`)

- **Module:** Study Hub / AI Gateway (`lib/ai/provider.ts`)
- **Severity:** High
- **Symptom:** When the primary model was slow, rate-limited or unavailable, the AI request hung or failed outright. The user saw an error with no retry path.
- **Root Technical Cause:** `callAI()` called a single model per provider with no shared deadline. An empty `KEY=` line in `.env.local` also counted as configured, which hid the fallback.
- **Remediation:** Added per-provider fallback model lists (for example `GOOGLE_AI_FALLBACK_MODELS`) tried in order under one shared deadline (`AI_TIMEOUT_MS = 15000`). Empty env values now count as unset (`||`, not `??`). A timeout returns a retryable "AI timed out" error (commits `99dd789`, `4a493b6`). Covered by `lib/ai/provider.test.ts`.

### Integration Defect 2: Repeated AI Prompts Re-Billed and Lost on Refresh (`ITC-DEF-02`)

- **Module:** Study Hub / AI Assistant Tab
- **Severity:** Medium
- **Symptom:** Asking the same question again called the provider again. Generated answers disappeared after a page refresh.
- **Root Technical Cause:** AI answers lived only in component state. No persistent store or request fingerprint existed.
- **Remediation:** Added the `ai_cache` table with owner-only RLS and `UNIQUE (user_id, cache_key)`. The key is a SHA-256 of the cache version, action and canonicalized inputs (`lib/ai/cacheKey.ts`). Five routes read and write the cache. A history list with delete was added to the AI tab (commit `d37a786`). `wellness-tip` is intentionally uncached.

### Integration Defect 3: Cross-Tab Save Not Reflected in Study Hub (`ITC-DEF-03`)

- **Module:** Study Hub (Notes / Flashcards / Quizzes)
- **Severity:** Medium
- **Symptom:** Saving an AI result from one tab did not appear in another tab until a manual reload.
- **Root Technical Cause:** `router.refresh()` re-renders the server tree, but a mounted client component keeps its own state and ignores fresh `initialData` props.
- **Remediation:** `StudyHubView` now owns the notes, flashcards and quizzes lists and passes them to the tabs as controlled props. This is documented as the one exception to the usual `router.refresh()` pattern in `AGENTS.md`.

### Integration Defect 4: Dark-Mode Colour Drift Across Components (`ITC-DEF-04`)

- **Module:** Theme / UI
- **Severity:** Low
- **Symptom:** Pastel palette shades (`emerald`, `sky`, `amber`, and others) stayed light-themed in dark mode and gave poor contrast.
- **Root Technical Cause:** Pastel shades were hard-coded Tailwind values, not tokens. Hand-added `dark:` variants were inconsistent.
- **Remediation:** Moved the palette to `--c-<hue>-<shade>` CSS variables (`:root` for light, `.dark` for the tint). Existing markup now flips automatically (commit `308dcdf`). `lib/theme.ts` owns resolution.

---

# CHAPTER 8: REFINEMENT & DEPLOYMENT

## 8.1 Final Module Implementation

Sprint 3 (2026-09-29 → 2026-10-06) finalized the remaining intelligent and secondary modules and hardened the integration points above.

### 1. Study Hub AI Assistant (Prompt Gateway + Persistent History)

- **Prompt Routes:** `explain`, `summarize`, `generate-flashcards`, `generate-quiz` and `study-plan` are served by `app/api/ai/*`. Each uses `startAIRoute`, `resolveNoteSource` and `runAI` from `lib/ai/route.ts`. The user is authenticated before any prompt is built.
- **Provider Abstraction:** `callAI()` is a raw-`fetch` layer that picks the first configured provider (OpenAI/`AI_API_KEY` → Anthropic → Google/Gemini) with ordered fallback models. When unconfigured it returns an error (HTTP 503) and never returns fake output.
- **AI Cache and History:** Answers persist in `ai_cache`, are listed in `AIAssistantTab`, and can be deleted by the user (`services/aiCache.service.ts`, `services/aiCacheClient.service.ts`).
- **Wellness Tip:** `POST /api/ai/wellness-tip` gives an optional AI tip. The rule-based suggestion stays visible when AI is off or times out.

### 2. Google Classroom / Calendar Auto-Sync

- **Auto-Sync:** `components/layout/AutoSync.tsx` and `lib/google/autoSync.ts` trigger a sync when the cache is stale (commit `569635d`). `POST /api/dashboard/sync` remains the only code path that calls Google.
- **Weighted Progress:** `assignments.weight` (migration `20260930000001`) feeds the 0–100 course score in `lib/progress.ts`.

### 3. Gamification (XP, Levels, Streaks, Badges)

- **XP Ledger:** Tasks, focus sessions and wellness entries award XP through server-side functions (migration `20260930000002_gamification.sql`). The level is 100 XP each, streaks are timezone-aware, and a toast reports each award (`lib/gamification.ts`, `XpSummary`, `BadgeGrid`).

### 4. Notes: Categories, PDF Attachments and Search

- **Categories and Filters:** Notes gained categories (`20260930000003_note_categories.sql`) and search/filters (`lib/notesForm.test.ts`).
- **PDF Attachments:** `note_attachments` plus the `notes-pdfs` Storage bucket, with a `useNoteAttachments` hook (commit `2bc75bc`). The Markdown preview allows only safe link schemes.

### 5. Schedule Module and Theme Preferences

- **Schedule:** Month, week, day and agenda views, event dialogs, event detail, type inference by keyword and colour-contrast-aware chips (commits `03abcdf`, `b47d73a`, `51d0877`).
- **Theme:** Light, dark and system modes persisted to `profiles.theme` (commit `260dcb8`).

## 8.2 System Optimization & UI Refactoring

### 1. Query & Latency Optimization

- **PostgreSQL Indexing:** Migration `20260906000001_perf_indexes.sql` adds owner-scoped indexes for filtered and sorted reads (for example `notes_user_updated_idx`, `tasks_user_status_completed_idx`, `schedule_user_type_start_idx`, `quiz_attempts_user_created_idx`). `ai_cache_user_created_idx` was added with the cache table.
- **Algorithmic Optimization:** Quadratic scans were replaced by single-pass `Map` grouping (`1b76c1a`). The Top-K task order uses a size-K heap, O(N log K) (`lib/scheduling.ts`).
- **Request Elimination:** The AI cache removes repeat provider calls. Dashboard pages read cache tables and never call Google.

### 2. Front-End UX Standardization

- **Token-Driven Dark Mode:** `gray-*`, `brand.gray`, `brand.dark` and the pastel palette resolve to CSS variables, so dark mode needs no per-component `dark:` classes (commits `260dcb8`, `308dcdf`).
- **Layout Refactor:** Analytics focus charts, note cards, the note view dialog, notes tab, sidebar, course view and grouped calendar events were refactored for layout and interaction (commit `9b8fa82`). Tests were added for `NoteParts` and `useGroupedEvents`.
- **Accessibility and Responsiveness:** QA checklist targets 375/768/1280 px with no horizontal scroll, a mobile drawer below `lg`, labelled icon buttons and visible focus rings.

### 3. Resilience & Error Handling

- **Graceful AI Degradation:** Unconfigured or timed-out AI returns a clear error (503, or a retryable timeout message). The UI never invents output, and rule-based wellness text remains.
- **Sync Failure Handling:** A failed sync keeps the cache and maps errors (`429` rate-limited, `403` no access, `401` reconnect).
- **Health Probe:** `GET /api/health` is a public liveness endpoint (`{ ok: true, time }`, `Cache-Control: no-store`) for uptime monitors.
- **Error Boundary:** `app/error.tsx` provides the route-level fallback.

---

# CHAPTER 9: USER ACCEPTANCE & SYSTEM VERIFICATION

## 9.1 End-to-End (E2E) Test Matrix

End-to-end tests follow a user journey from login through the integrated modules to logout. They are executed manually against a production build (`npm run build && npm start`) or a Vercel preview, using `docs/qa-checklist.md`. **Actual Outcome** and **Status** are left open until a tester runs each scenario.

| Test ID | E2E Workflow Scenario | Steps Executed | Expected Outcome | Actual Outcome | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **E2E-01** | **First Login & Secure Access** | 1. Sign in with a new account. 2. Forced to `/change-password`. 3. Set a new password. 4. Reach `/dashboard`. 5. Open `/dashboard` in a signed-out window. 6. Log out. | Password change is forced. The dashboard loads afterwards. A signed-out request is redirected to `/login?redirectTo=`. The session ends cleanly. | _To be recorded by tester_ | **PENDING** |
| **E2E-02** | **Google Classroom Sync** | 1. Log in. 2. Settings → Connect Google. 3. Grant consent. 4. Press Sync Now. 5. Open Courses and Schedule. | Courses, assignments and events appear from the cache. The staleness nudge clears. | _To be recorded by tester_ | **PENDING** |
| **E2E-03** | **Task Planning Workflow** | 1. Create tasks with priorities and due dates. 2. Check the smart order. 3. Complete a recurring task. 4. Check XP toast and the Achievements page. | Smart order puts overdue and urgent tasks first. The next recurrence is created. XP and streak update once. | _To be recorded by tester_ | **PENDING** |
| **E2E-04** | **Study Hub AI Workflow** | 1. Write a note and attach a PDF. 2. AI tab → generate flashcards and a quiz. 3. Save both. 4. Repeat the same request. 5. Delete a history entry. | Results appear in Study Hub. The repeat request returns `cached`. Deleting removes the history row. | _To be recorded by tester_ | **PENDING** |
| **E2E-05** | **AI Unavailable Path** | 1. Unset all AI keys (or block the provider). 2. Run an AI action. 3. Open Wellness. | The route returns 503 or "AI timed out". The UI shows a clear message with no fake content. The rule-based wellness suggestion remains. | _To be recorded by tester_ | **PENDING** |
| **E2E-06** | **Theme & Responsive Pass** | 1. Toggle light, dark and system. 2. Reload and open a second tab. 3. Check 375/768/1280 px on every dashboard page. | Theme persists and syncs across tabs. There is no horizontal scroll. The sidebar becomes a drawer below `lg`. | _To be recorded by tester_ | **PENDING** |
| **E2E-07** | **Data Isolation** | 1. As user A, query `notes`, `note_attachments` and `wellness_entries` from the browser console. 2. Try a signed URL under user B's storage folder. | Only user A's rows return. The signed URL is denied. | _To be recorded by tester_ | **PENDING** |

## 9.2 User Acceptance Testing (UAT)

Two peer evaluators run the E2E workflows independently. Their feedback must be collected from real sessions, so the rows below are a template and contain no invented quotes.

- **Evaluator 1:** Student user (represents the primary user base).
- **Evaluator 2:** Instructor or staff proxy (represents teacher/admin usability).

| Evaluator | Workflow Tested | Satisfaction Metric | User Feedback & Notes |
| :-- | :-- | :-- | :-- |
| **Evaluator 1 (Student)** | E2E-03 (Tasks) | _PASS / FAIL_ | _Record feedback_ |
| **Evaluator 1 (Student)** | E2E-04 (Study Hub AI) | _PASS / FAIL_ | _Record feedback_ |
| **Evaluator 2 (Staff Proxy)** | E2E-02 (Google Sync) | _PASS / FAIL_ | _Record feedback_ |

## 9.3 Video Demonstration Walkthrough

Record a screen capture covering login, the dashboard, Google sync, the smart task list, the Study Hub AI tab with cache history, the schedule views and the dark-mode toggle. Add the link or QR code here: _URL pending_.

## 9.4 Project Sign-Off Declaration

### Final System Verification Statement

Sign-off is **conditional** on the following items, which are not yet recorded:

- **Automated Gates:** Met on commit `9b8fa82`: `npm test` (56 files, 530 passed, 2 skipped), `npm run lint` (0 errors, 1 warning) and `npm run build` (success). Re-run them if the code changes before release.
- **E2E and UAT:** The E2E-01 to E2E-07 outcomes and the UAT feedback above are filled in.
- **Known Scope Notes:** Roles come from `app_metadata` only and `ROUTE_ROLES` is empty. `academic_settings`, `courses.manual_grade` and `courses.target_pct` remain in the schema unused. Services and most route handlers are not unit-tested, so the integration rows marked **MANUAL** rely on the QA checklist.

Once those conditions are met, the team can declare the StudentHub project functionally complete and ready for final academic defense.
