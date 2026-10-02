# API Routes

Next.js Route Handlers used by StudentHub. All route handlers create a
server-side Supabase client (`lib/supabase/server.ts`) and rely on RLS for
authorization at the row level; handlers that act on the current user check the
session explicitly via `auth.getUser()`.

## `/auth/callback`

| | |
|---|---|
| Method | `GET` |
| File | `app/auth/callback/route.ts` |
| Auth | None (public) |
| Purpose | Exchanges a Supabase auth code or OTP token for a session (password reset, email confirmation, Google sign-in) |

**Query params**

| Param | Description |
|---|---|
| `code` | Supabase authorization code (PKCE flows) |
| `token_hash`, `type` | OTP link token (e.g. `type=recovery`) |
| `error`, `error_description` | Set by Supabase when a link is expired or invalid |
| `next` | (optional) safe redirect target; sanitized by `utils/safeRedirect.ts` (defaults to `/dashboard`) |

**Behavior**

1. If `error` is present without `code`/`token_hash`: `302` to `next` with
   the error params forwarded.
2. With `code`: `exchangeCodeForSession(code)`.
3. With `token_hash` + `type`: `verifyOtp({ token_hash, type })`.
4. On success: `302` to `${origin}${next}`. On failure: `302` to `next`
   with `?error=auth-callback-failed` (plus `error_description` for OTP).
5. With none of the above: `302` to `/login?error=auth-callback-failed`.

The proxy forwards stray `?code=` / `?token_hash=` links that land on other
paths to this route (see [auth.md](auth.md#proxy-protection)).

## `/auth/confirm`

| | |
|---|---|
| Method | `GET` |
| File | `app/auth/confirm/route.ts` |
| Auth | None (public) |
| Purpose | Supabase-recommended OTP endpoint; thin alias of `/auth/callback` for `token_hash` links, with `next` defaulting to `/reset-password` |

## `/api/google/auth`

| | |
|---|---|
| Method | `GET` |
| File | `app/api/google/auth/route.ts` |
| Auth | Required (redirects to `/login` if unauthenticated) |
| Purpose | Starts the Google OAuth consent flow |

**Behavior**

1. Loads the current user; if none → `302` redirect to `/login`.
2. Builds the consent URL (`buildGoogleAuthUrl`) with a fresh `state` and PKCE
   `code_verifier`.
3. Sets two HttpOnly cookies, `google_oauth_state` and
   `google_oauth_verifier`, with `maxAge = 600` (10 minutes),
   `sameSite = "lax"`, `secure` in production.
4. `302` redirect to the Google consent screen.

## `/api/google/callback`

| | |
|---|---|
| Method | `GET` |
| File | `app/api/google/callback/route.ts` |
| Auth | Required (redirects to `/login` if unauthenticated) |
| Purpose | Handles the Google redirect: validates state, exchanges the code for tokens, persists them, triggers an initial sync |

**Query params**

| Param | Description |
|---|---|
| `code` | Google authorization code |
| `state` | State echoed back from Google (must match the cookie) |
| `error` | Present when the user denied consent |

**Behavior**

1. If `error` is present → redirect to `/dashboard?google=auth_denied`.
2. Reads and deletes the `google_oauth_state` and `google_oauth_verifier`
   cookies.
3. If `code`, `state`, or the verifier is missing, or `state !== savedState` →
   redirect to `/dashboard?google=state_mismatch` (CSRF / expired callback).
4. Loads the user; if none → redirect to `/login`.
5. `storeGoogleAccount(userId, code, codeVerifier)` — exchanges the code,
   resolves userinfo, and upserts the **encrypted** tokens into
   `google_accounts`. On failure → redirect to `/dashboard?google=error`.
6. Best-effort `syncGoogleData(userId)` (initial sync; failures surface later
   as a dashboard banner).
7. Redirect to `/dashboard?google=linked`.

## `/api/dashboard/sync`

| | |
|---|---|
| Method | `POST` |
| File | `app/api/dashboard/sync/route.ts` |
| Auth | Required |
| Purpose | On-demand refresh of the Google cache. The only path that talks to Google for the signed-in user |

**Request body** — none (manual "Sync now"), or `{ "auto": true }` from the
dashboard shell's once-per-tab-session sign-in sync (`components/layout/AutoSync.tsx`).
With `auto`, the route first checks `shouldAutoSync` (`lib/google/autoSync.ts`)
and, if no Google account is linked, it needs reconnecting, or it was synced
within the last 10 minutes, returns `200 { "success": true, "message": "skipped", "data": { "skipped": true } }`
without calling Google.

**Response** — `ApiResult<SyncResult>` JSON:

```jsonc
// 200
{
  "success": true,
  "message": "Synced your school data.",
  "data": {
    "courses": 4,
    "assignments": 23,
    "announcements": 7,
    "calendarEvents": 15,
    "lastSyncedAt": "2026-08-13T12:00:00.000Z"
  }
}

// 401 (unauthenticated)
{ "success": false, "message": "Not authenticated." }

// 400 (e.g. no Google account linked, needs reconnect, or Google error)
{ "success": false, "message": "Connect a Google account before syncing." }
```

**Status mapping:** `401` when unauthenticated; `400` when
`syncGoogleData` returns a failure; `200` on success.

Consumed by the Sync Now button (`components/dashboard/SyncNowButton.tsx`),
which then calls `router.refresh()` to re-render the server component tree.

## AI routes

All five routes live under `app/api/ai/` and share the same shape:

- `POST` with a JSON body; session required (`401` otherwise), `400` on
  invalid JSON or missing input.
- Where a `noteId` is accepted, the note is loaded with
  `.eq("user_id", user.id)` (`404` if not found) and its content replaces
  `content`. Content is truncated to 6000 characters in the prompt.
- The prompt goes to `callAI(prompt, system)` in `lib/ai/provider.ts`, which
  picks the first configured provider (`OPENAI_API_KEY`/`AI_API_KEY`, then
  `ANTHROPIC_API_KEY`, then `GOOGLE_AI_API_KEY`/`GEMINI_API_KEY`) and aborts
  after 15 seconds. The Google chain falls back through
  `GOOGLE_AI_FALLBACK_MODELS` on a 404/429/5xx, sharing that one budget; a
  400/401/403 fails immediately.
- Errors: `503` when no provider is configured, `502` for provider errors,
  timeouts or unparseable JSON output. Responses are
  `{ success, message?, data? }`.

Five of the six routes (`explain`, `summarize`, `generate-flashcards`,
`generate-quiz`, `study-plan`) also persist their answer in `ai_cache` and add
two fields to the response:

- `cached: boolean` — `true` when the answer came from `ai_cache` and no
  provider call was made.
- `refresh?: boolean` in the body skips the lookup and asks the model again,
  overwriting the stored answer. This backs the tab's Regenerate button.

The key is `aiCacheKey(action, inputs)` — a sha256 over the action and exactly
the inputs sent to the model (`lib/ai/cacheKey.ts`). The resolved note text is
part of it, so editing a note invalidates its own answers. Cache failures never
fail a request: `readAiCache`/`writeAiCache` in `lib/ai/cache.ts` log and
swallow. `/api/ai/wellness-tip` is not cached — it is a passive tip, not a
prompt.

| Route | Body | `data` on success |
|---|---|---|
| `/api/ai/explain` | `{ concept, courseId? }` | `{ explanation }` |
| `/api/ai/summarize` | `{ noteId?, content?, title? }` (content ≥ 20 chars) | `{ summary, title }` |
| `/api/ai/generate-flashcards` | `{ noteId?, content?, count? }` (content ≥ 30 chars, count 1–10, default 5) | `{ flashcards: { front, back }[] }` |
| `/api/ai/generate-quiz` | `{ noteId?, content?, count?, title? }` (content ≥ 30 chars, count 1–8, default 5) | `{ questions: { question_text, question_type, options?, correct_answer, explanation }[] }` |
| `/api/ai/study-plan` | `{ topic, courseId?, durationDays? }` (1–30, default 7) | `{ plan, topic, durationDays }` |
| `/api/ai/wellness-tip` | `{ focusMinutesToday, upcomingDeadlinesCount }` (numbers, clamped) | `{ tip }` (one plain-text sentence, ≤ 220 chars) |

The routes only generate content; saving flashcards/quizzes happens
client-side through `flashcardsClientService` / `quizzesClientService`. Stored
answers are listed and deleted client-side through `aiCacheClientService` /
`services/aiCache.service.ts` (RLS scopes both to the caller).

## `/api/health`

`GET` → `200 { "ok": true, "time": "<ISO timestamp>" }` with `Cache-Control: no-store`.
Public (listed in `PUBLIC_ROUTES`) so uptime monitors can call it without a
session; it reads no user data and makes no Supabase queries itself.

## Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/callback` | GET | none | Exchange Supabase auth code / OTP token for session |
| `/auth/confirm` | GET | none | OTP-link alias of `/auth/callback` |
| `/api/ai/*` | POST | session | Explain, summarize, generate flashcards/quizzes, study plans, wellness tip |
| `/api/google/auth` | GET | session | Start Google OAuth consent flow |
| `/api/google/callback` | GET | session | Finalize Google link + initial sync |
| `/api/dashboard/sync` | POST | session | Pull Google data into the Supabase cache |
| `/api/health` | GET | none | Liveness probe (`{ ok, time }`) |