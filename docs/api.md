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
| Purpose | Exchanges a Supabase auth code for a session (password-reset and OAuth sign-in flows) |

**Query params**

| Param | Description |
|---|---|
| `code` | The Supabase authorization code |
| `next` | (optional) safe redirect target; sanitized by `utils/safeRedirect.ts` (defaults to `/dashboard`) |

**Behavior**

1. Reads `code` and `next`.
2. Calls `supabase.auth.exchangeCodeForSession(code)`.
3. On success → `302` redirect to `${origin}${next}`.
4. On failure or missing code → `302` redirect to
   `${origin}/login?error=auth-callback-failed`.

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

**Request body** — none.

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

## Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/callback` | GET | none | Exchange Supabase auth code for session |
| `/api/google/auth` | GET | session | Start Google OAuth consent flow |
| `/api/google/callback` | GET | session | Finalize Google link + initial sync |
| `/api/dashboard/sync` | POST | session | Pull Google data into the Supabase cache |