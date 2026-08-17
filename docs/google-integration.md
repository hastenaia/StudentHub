# Google Integration

The Academic Dashboard integrates with **Google Classroom** and **Google
Calendar** through a server-side OAuth 2.0 **authorization-code + PKCE** flow
with read-only scopes. Google data is pulled on demand into a local Supabase
cache; the dashboard itself never calls Google per page load.

## Architecture

```
Settings → "Connect Google" → GET /api/google/auth
    sets httpOnly cookies: google_oauth_state, google_oauth_verifier
    redirects to Google consent screen
        ▼
Google redirects to GET /api/google/callback?code=...&state=...
    validates state (CSRF)
    exchanges code + PKCE verifier for tokens
    encrypts tokens (AES-256-GCM) → google_accounts
    triggers an initial sync
        ▼
GET /api/dashboard/sync  (or the Sync Now button)
    refreshes token if near expiry
    pulls Classroom courses/courseWork/announcements + rolling Calendar window
    upserts into courses, assignments, announcements, calendar_events
```

## OAuth flow details

Implemented in `lib/google/tokens.ts` (pure, stateless mechanics) and
`services/google.service.ts` (persistence).

- **Grant type:** `authorization_code` with PKCE (S256).
- **Parameters:** `response_type=code`, `access_type=offline`,
  `prompt=consent`, `include_granted_scopes=true`. The `offline` + `consent`
  combination guarantees a refresh token is returned.
- **Scopes** (`GOOGLE_SCOPES` in `types/google.ts`):

  ```
  openid
  email
  https://www.googleapis.com/auth/calendar.readonly
  https://www.googleapis.com/auth/classroom.courses.readonly
  https://www.googleapis.com/auth/classroom.coursework.me.readonly
  https://www.googleapis.com/auth/classroom.announcements.readonly
  ```

- **State / verifier handling:** `GET /api/google/auth` generates a random
  `state` and PKCE `code_verifier`, stores both in short-lived (10 min)
  HttpOnly cookies (`google_oauth_state`, `google_oauth_verifier`), and
  redirects to Google. `GET /api/google/callback` reads the cookies, verifies
  the returned `state` matches (CSRF protection), exchanges the code using the
  stored verifier, and clears the cookies. Tokens never hit the browser.
- **Identity:** after the exchange, the OpenID `userinfo` endpoint is called to
  resolve `sub` (stable Google id) and `email`, stored on `google_accounts`.

## Token storage & encryption

`lib/google/crypto.ts` encrypts both the access and refresh tokens with
**AES-256-GCM** before they are written to `google_accounts`.

- The key is derived by SHA-256 hashing the `GOOGLE_TOKEN_ENCRYPTION_KEY` env
  var into a 32-byte key (`createHash("sha256")`).
- Each encryption uses a fresh random 96-bit IV and an auth tag.
- Stored payload format: `<iv b64>.<authTag b64>.<ciphertext b64>` — each row is
  self-describing and integrity-checked. Tampered ciphertext fails GCM
  authentication and throws rather than returning garbage.
- The plaintext key never leaves the server, is never logged, and never reaches
  the browser. Rotating the key invalidates stored tokens (users simply
  reconnect).

## Token refresh

`getValidAccessToken` (`services/google.service.ts`):

- If `token_expires_at` is more than 60s in the future, the stored access token
  is decrypted and reused.
- Otherwise the refresh token is decrypted, exchanged via
  `refreshToken` (`lib/google/tokens.ts`), and the new access token (and any new
  refresh token) are re-encrypted and persisted.
- If a refresh fails, `needs_reconnect` is set on the account and the UI shows a
  "reconnect" banner.

## Sync pipeline

`syncGoogleData(userId)` (`services/google.service.ts`) is the single entry
point (called by `POST /api/dashboard/sync` and, best-effort, after the OAuth
callback). It is idempotent and safe to re-run.

1. Loads the `google_accounts` row; fails gracefully if missing or flagged
   `needs_reconnect`.
2. Obtains a valid access token (reuse or refresh).
3. **Courses** — `listCourses` (active courses only) → upserted into `courses`
   with `source='classroom'` and `credit_hours=3` (adjustable in settings),
   keyed on `(user_id, google_course_id)`. Classroom courses that no longer
   exist on Google's side are deleted.
4. **Assignments** — for each course, `listCourseWork` + the student's
   `listStudentSubmissions`; the first submission is used for grade, submitted
   state, and raw state. Upserted in batches of 100 keyed on
   `(user_id, google_course_work_id)`. CourseWork items no longer present are
   deleted.
5. **Announcements** — `listAnnouncements` per course → upserted into
   `announcements` keyed on `(user_id, google_announcement_id)`; stale rows are
   deleted.
6. **Calendar** — `listEvents` over a rolling window
   (`buildWindow`: 7 days past, 21 days future) → the `calendar_events` table
   is **deleted and re-inserted wholesale** (snapshot semantics).
7. Stamps `last_synced_at` on `google_accounts`.

The return value is a `SyncResult` with counts: `{ courses, assignments,
announcements, calendarEvents, lastSyncedAt }`.

### Error mapping

`mapSyncError` (`services/google.service.ts`) maps HTTP statuses to friendly
messages: `429` → rate-limited, `403` → account lacks access, `401` → session
expired (also marks `needs_reconnect`). `GoogleHttpError` (`lib/google/tokens.ts`)
carries the status so callers can branch. On failure the existing cache is kept
so the dashboard still renders.

## Google API clients

| Client | File | Endpoints |
|---|---|---|
| Classroom | `services/classroom.service.ts` | `courses` (ACTIVE), `courses/{id}/courseWork`, `courses/{id}/courseWork/{id}/studentSubmissions`, `courses/{id}/announcements` — each with a `pageToken` pagination loop |
| Calendar | `services/calendar.service.ts` | `calendars/primary/events` with `singleEvents=true`, `orderBy=startTime`, `maxResults=250`, rolling `timeMin`/`timeMax` |

Both use `googleFetch` (`lib/google/tokens.ts`), an authenticated GET helper
that throws `GoogleHttpError` on non-2xx responses.

## Typed Google payloads

`types/google.ts` defines narrow, typed views of the consumed Google API
responses (`GoogleCourse`, `GoogleCourseWork`, `GoogleStudentSubmission`,
`GoogleAnnouncement`, `GoogleCalendarEvent`, token/userinfo responses) so the
sync layer is robust against fields Google adds that StudentHub doesn't care
about.

## Dashboard reads (no Google)

`services/academics.service.ts` builds all dashboard views purely from the
Supabase cache tables. `GET /dashboard` never calls Google. A cache is
considered **stale** after 12 hours (`STALENESS_MS`), which triggers the
"Sync now" nudge on the dashboard (`SyncNowCard`).

## Disconnecting

`academicsClientService.disconnectGoogle()` deletes the user's `courses`
(cascading to `assignments` and `announcements`), `calendar_events`, and the
`google_accounts` row — removing all cached Google data while keeping the
StudentHub account.
