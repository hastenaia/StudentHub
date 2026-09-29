# StudentHub — Project Documentation

Your all-in-one student management platform: courses, schedules, tasks,
study tools, and wellness, organized and always in sync.

StudentHub combines a student's own planning data (tasks, schedule, notes,
flashcards, focus sessions, mood check-ins) with a read-only cache of their
Google Classroom and Google Calendar, in a single private dashboard. It is
built on Next.js (App Router) with a Supabase backend (Auth, PostgreSQL, Row
Level Security, Storage).

> Generated from `README.md` and `docs/*.md`. Edit those files and regenerate
> this one rather than editing it directly.

## Table of Contents

1. [Overview & Quick Start](#1-overview--quick-start)
2. [Architecture](#2-architecture)
3. [Authentication & RBAC](#3-authentication--rbac)
4. [Data Model](#4-data-model)
5. [Google Integration](#5-google-integration)
6. [API Routes](#6-api-routes)
7. [Testing](#7-testing)
8. [Deployment](#8-deployment)

---

## 1. Overview & Quick Start

### Features

- **Authentication**: email/password sign-up and sign-in, Google sign-in,
  cookie-based sessions, password reset, and a forced first-login password
  change for admin-created accounts.
- **Role-based access control**: `student` / `teacher` / `admin` roles
  enforced in the request proxy.
- **Dashboard**: today's schedule, priority tasks, upcoming deadlines, focus
  stats, study activity, announcements, and a smart recommendation.
- **Courses**: Google Classroom courses plus manually tracked ones.
- **Schedule**: month / week / day / agenda views of your own events, with
  Google Calendar events shown read-only.
- **Tasks**: Kanban and list views, priorities, tags, recurring tasks, and a
  min-heap "Suggested Order" (`lib/scheduling.ts`).
- **Study Hub**: Markdown notes with PDF attachments, flashcards, quizzes, and
  an AI assistant (explain, summarize, generate flashcards/quizzes, study
  plans).
- **Focus**: Pomodoro timer with presets and procedurally generated ambient
  sounds.
- **Wellness**: daily mood check-in and journal, weekly mood chart, workload
  overview.
- **Analytics & Achievements**: cross-module stats, plus XP, streaks and badges
  from real activity.
- **Google integration**: read-only OAuth 2.0 (PKCE) link to Google Classroom
  and Google Calendar, with on-demand sync into a local Supabase cache.
- **Settings**: profile, preferences (timezone, theme, default views), the
  Google connection, and manual courses.

### Tech stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 16 (App Router), React 18                      |
| Language   | TypeScript                                             |
| Styling    | Tailwind CSS, class-variance-authority, tailwind-merge |
| Animations | Framer Motion                                          |
| Drag & drop | dnd-kit                                               |
| Icons      | lucide-react                                           |
| Forms      | react-hook-form + zod (`@hookform/resolvers`)          |
| Backend    | Supabase (Auth, PostgreSQL, RLS, Storage)              |
| AI         | OpenAI-compatible, Anthropic, or Google (server-side, `lib/ai/provider.ts`) |
| Testing    | Vitest + Testing Library (jsdom)                       |
| Linting    | ESLint (`eslint-config-next`, flat config)             |

Exact dependency versions are pinned in `package.json` / `package-lock.json`.

### Quick start

#### 1. Install dependencies

```bash
npm install
```

#### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase project
values. Never commit real keys.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Optional groups:

- **Google Classroom/Calendar**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY` (see
  [Google integration setup](#google-integration-setup)).
- **AI features**: one of `OPENAI_API_KEY` (or `AI_API_KEY`),
  `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY` (or `GEMINI_API_KEY`). Without
  one, the AI tab shows a configuration error instead of fake responses.

#### 3. Set up the database

Apply the migrations in `supabase/migrations/`, either with the Supabase CLI
(`npm run db:migrate`) or by running each file in timestamp order in the
Supabase SQL Editor. `supabase/schema.sql` and `supabase/consolidated.sql` are
older partial snapshots; see [docs/data-model.md](#4-data-model).

Then, in Supabase → Authentication → URL Configuration, set the Site URL to
`http://localhost:3000` and add `http://localhost:3000/**` to Redirect URLs so
password-reset and confirmation links return to the app.

#### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Unauthenticated visitors are redirected to
`/login`.

### Google integration setup

The Classroom/Calendar integration uses a server-side OAuth 2.0
authorization-code + PKCE flow with read-only scopes. Full setup
instructions are in [docs/google-integration.md](#5-google-integration)
and [docs/deployment.md](#8-deployment). The required environment
variables are:

```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=<random-64-char-hex>
```

"Continue with Google" sign-in is separate: it is Supabase's Google auth
provider, enabled in the Supabase dashboard.

#### How the module works

- **Pages** are Server Components that read the Supabase cache. They never
  call Google on page load.
- **Sync** (`POST /api/dashboard/sync`) is the only path that talks to Google:
  on demand, it fetches Classroom courses/assignments/announcements and a
  rolling Calendar window, then upserts them into `courses`, `assignments`,
  `announcements` and `calendar_events` (all owner-only RLS).
- **Tokens** are encrypted with AES-256-GCM before being stored in
  `google_accounts`.

### Architecture

Each feature follows the same pattern: an async Server Component page reads
data through `services/<domain>.service.ts` and passes it to a client
`components/<domain>/<Domain>View.tsx`, which writes back through
`services/<domain>Client.service.ts` (returning `ApiResult` from
`types/api.ts`). Request protection lives in `proxy.ts` →
`lib/supabase/middleware.ts`. See [docs/architecture.md](#2-architecture)
for the directory map, module table and request lifecycle.

### Scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm start            # start the production server
npm test             # run unit tests (vitest)
npm run test:watch   # watch mode
npm run lint         # ESLint
npm run typegen      # regenerate types/database.types.ts (needs Supabase CLI)
npm run db:reset     # reset local supabase db (needs CLI)
npm run db:migrate   # push migrations (needs CLI)
```

### Deploying

Push to GitHub and import the repository in Vercel. Add the Supabase (and
Google / AI, if used) environment variables in the Vercel project settings.
See [docs/deployment.md](#8-deployment).

### Design system

| Token                | Value     |
| -------------------- | --------- |
| Royal Blue (primary) | `#0033A0` |
| Royal Blue dark      | `#002478` |
| Sky Blue (accent)    | `#87CEEB` |
| White                | `#FFFFFF` |
| Gray (surface)       | `#F4F6F9` |
| Dark (text)          | `#1A1A1A` |
| Font                 | Inter     |

Fully responsive across desktop, tablet, and mobile, with a collapsible mobile
sidebar, skeleton loading states, and toast notifications.

---

## 2. Architecture

### Overview

StudentHub is a Next.js 16 App Router application with a Supabase backend
(Auth, PostgreSQL with Row Level Security, Storage). Pages are async Server
Components that read Supabase and hand a view model to a client component;
client components write back through per-domain client services. Google data
is cached in Supabase and refreshed only through `POST /api/dashboard/sync`.
AI features go through server-only route handlers under `/api/ai/*`.

```
Browser
  │  proxy.ts → lib/supabase/middleware.ts (updateSession)
  │    • rescue stray ?code= / ?token_hash= auth links → /auth/callback
  │    • refresh session cookie
  │    • redirect unauthenticated users to /login
  │    • force first-login password change
  │    • enforce route-level RBAC
  ▼
Server Components (app/(dashboard)/dashboard/**/page.tsx)
  │  services/<domain>.service.ts ──► Supabase (RLS-protected tables)
  │  passes initialData to components/<domain>/<Domain>View.tsx
  ▼
Client components
  ├─ services/<domain>Client.service.ts ──► Supabase (writes, ApiResult)
  ├─ POST /api/dashboard/sync ──► Google APIs (the only Google caller)
  └─ POST /api/ai/*            ──► AI provider (lib/ai/provider.ts)
```

### Directory map

```
app/
  (auth)/                Public auth pages: login, signup, forgot-password,
                         reset-password, change-password
  (dashboard)/           Authenticated shell + dashboard/* feature pages
  auth/callback/         Exchanges a Supabase auth code / OTP token for a session
  auth/confirm/          OTP (token_hash) alias of /auth/callback
  api/
    google/auth/         Starts the Google OAuth (Classroom/Calendar) consent flow
    google/callback/     Stores encrypted Google tokens, runs an initial sync
    dashboard/sync/      On-demand sync of Google data into the cache
    ai/*/                explain, summarize, generate-flashcards, generate-quiz, study-plan
components/
  ui/                    Primitives (Button, Input, Card, Form, Select, Skeleton, Toaster)
  layout/                Sidebar, Navbar, DashboardShell
  <domain>/              Feature components: auth, dashboard, courses, schedule,
                         tasks, study, focus, analytics, wellness, gamification, settings
  common/                ErrorBoundary, Skeletons
hooks/                   useAuth, useToast, useGroupedEvents
lib/
  supabase/              Browser/server clients, shared cookie factory, session
                         middleware, error mapping
  rbac.ts                Role hierarchy + route-level access map
  ai/provider.ts         Server-only multi-provider AI call with timeout
  google/                OAuth token mechanics + AES-256-GCM token encryption
  scheduling.ts          Min-heap task ordering + recurrence math (unit-tested)
  focus.ts               Focus/Pomodoro helpers
  taskView.ts, courseView.ts, scheduleView.ts   DB row → view-model mappers
  validations/           Zod schemas per domain
  mocks/                 Mock data still used by a few legacy components
services/
  <domain>.service.ts        Server-side reads / view assembly
  <domain>Client.service.ts  Client-side writes returning ApiResult
  auth.service.ts            All Supabase Auth calls (client-side)
  google.service.ts          Google OAuth storage + sync pipeline
  classroom.service.ts, calendar.service.ts   Thin Google API clients
types/                   Generated database types + domain + ApiResult types
utils/                   cn(), validation, date, safeRedirect helpers (+ tests)
proxy.ts                 Next 16 request proxy (formerly middleware.ts) + matcher
supabase/
  migrations/            Timestamped migrations: the schema source of truth
  schema.sql, consolidated.sql   Older single-file snapshots (see data-model.md)
```

### Feature modules

Every page under `app/(dashboard)/dashboard/` is listed in the sidebar
(`components/layout/Sidebar.tsx`).

| Route | Server read | Main tables |
|---|---|---|
| `/dashboard` | `dashboard.service.ts` → `getProductivityDashboardData` | tasks, schedule_events, calendar_events, assignments, announcements, courses, focus_sessions, notes, google_accounts |
| `/dashboard/courses` | `courses.service.ts` | courses |
| `/dashboard/schedule` | `schedule.service.ts` | schedule_events (editable) + calendar_events (Google, read-only) |
| `/dashboard/tasks` | `tasks.service.ts` (runs the min-heap scheduler) | tasks, courses |
| `/dashboard/study` | `notes.service.ts`, `flashcards.service.ts`, `quizzes.service.ts` | notes, note_attachments, flashcards, quizzes, quiz_questions, quiz_attempts |
| `/dashboard/focus` | `focus.service.ts` | focus_sessions |
| `/dashboard/analytics` | `analytics.service.ts` | tasks, focus_sessions, notes, flashcards, quiz_attempts, schedule_events, wellness_entries |
| `/dashboard/wellness` | `wellness.service.ts` | wellness_entries |
| `/dashboard/achievements` | client-side in `BadgeGrid` | tasks, focus_sessions, notes, quiz_attempts |
| `/dashboard/settings` | `academics.service.ts` → `getGoogleAccountView` | profiles, google_accounts, courses |
| `/dashboard/notes` | none: client page on `lib/mocks/notes` | none (real notes live in Study Hub) |

Known leftovers: `/dashboard/notes` is still mock-backed, and the Schedule page
renders a mock-backed `CalendarShell` below the real `ScheduleView`.

### Request lifecycle

1. **Proxy** (`proxy.ts` → `updateSession` in `lib/supabase/middleware.ts`)
   runs on every non-static request. It first redirects any request carrying
   `?code=`, `?token_hash=` or `?error=` outside the auth routes to
   `/auth/callback` (Supabase falls back to the Site URL when the redirect
   allow-list isn't configured). It then creates a cookie-bound Supabase
   client, calls `auth.getUser()`, and applies the checks described in
   [auth.md](#3-authentication--rbac).
2. **Server Component** loads the user with `lib/supabase/server.ts`, calls its
   domain's `get<Domain>Data(userId)` and passes the result as `initialData`
   to the client view.
3. **Client interactions** call `<domain>ClientService` methods (which return
   `ApiResult<T>` from `types/api.ts`), update local state optimistically, and
   call `router.refresh()` where server data must be re-read.

### Client vs. server

| Concern | Server | Client |
|---|---|---|
| Supabase client | `lib/supabase/server.ts` (via `cookies()`) | `lib/supabase/client.ts` (`createBrowserClient`) |
| Proxy session | `lib/supabase/factory.ts` (cookie adapter) | none |
| Auth calls | none | `services/auth.service.ts` |
| Page data | `services/<domain>.service.ts` | none |
| Writes | none | `services/<domain>Client.service.ts` |
| Google network calls | `services/google.service.ts` (route handlers only) | none |
| AI calls | `lib/ai/provider.ts` (route handlers only) | `fetch("/api/ai/...")` |

Server Components, Route Handlers and the proxy all build their Supabase
client via `createServerCookieClient` in `lib/supabase/factory.ts`.

### Modules

#### Authentication & RBAC
Email/password and Google sign-in via Supabase Auth, a forced first-login
password change, and a `student`/`teacher`/`admin` role model enforced in the
proxy. See [auth.md](#3-authentication--rbac).

#### Google Classroom & Calendar
Read-only OAuth link, encrypted token storage, and an idempotent sync into
cache tables. See [google-integration.md](#5-google-integration).

#### Tasks
Kanban + list views with dnd-kit, priorities, tags, recurrence
(`nextRecurrence`), and a "Suggested Order" computed by the min-heap in
`lib/scheduling.ts` (`buildSchedule`; `buildTopSchedule` for the dashboard).

#### Study Hub
Notes (Markdown preview, tags, favorites, PDF attachments stored in the
private `notes-pdfs` Storage bucket), flashcards, quizzes with attempts, and an
AI assistant tab. AI results can be saved as flashcards/quizzes.

#### AI
`/api/ai/*` handlers authenticate the user, optionally load a note by
`noteId`, build a prompt and call `callAI()` in `lib/ai/provider.ts`. See
[api.md](#6-api-routes).

#### Focus, Wellness, Analytics, Achievements
Pomodoro timer with ambient sounds (`ChillHub`, procedurally generated), daily
mood check-ins with journal, cross-module analytics, and badges/XP/streaks
computed from real activity.

#### Settings
Profile, preferences (timezone, theme, default calendar/task views,
notifications, stored on `profiles`), the Google connection, and manually
tracked courses.

### Data flow notes

- Pages never call Google. They read cache tables only.
- `POST /api/dashboard/sync` is the only path that contacts Google for the
  signed-in user. It is idempotent and safe to re-run.
- Google OAuth tokens are encrypted at rest (AES-256-GCM) before being stored
  in `google_accounts` (`lib/google/crypto.ts`). The plaintext never touches
  Postgres or the browser.
- AI keys are server-only. When no provider is configured, the AI routes
  return a 503 with a configuration message, never fake output.

### Design system

Tokens are defined in `tailwind.config.ts` under `theme.extend.colors.brand`
and used as Tailwind utilities (e.g. `bg-brand-royal`, `text-brand-dark`).

| Token | Value |
|---|---|
| `brand-royal` (primary) | `#0033A0` |
| `brand-royal-dark` | `#002478` |
| `brand-sky` (accent) | `#87CEEB` |
| `brand-white` | `#FFFFFF` |
| `brand-gray` (surface) | `#F4F6F9` |
| `brand-dark` (text) | `#1A1A1A` |

Additional Tailwind color roles (primary/secondary/muted/accent/card) map onto
these brand values; `border`/`input`/`ring`/`background`/`foreground` use CSS
variables from `app/globals.css`. The Inter font is loaded via
`next/font/google` and exposed as `--font-inter`. Classes are merged with
`cn()` from `utils/cn.ts`.

---

## 3. Authentication & RBAC

StudentHub uses **Supabase Auth** with email/password and Google sign-in.
Sessions are stored in HTTP-only cookies managed through `@supabase/ssr` and
refreshed by the Next.js request proxy (`proxy.ts`) on every request.

### Session management

Three Supabase client entry points exist, all typed against
`types/database.types.ts`:

| Client | File | Where it's used |
|---|---|---|
| Browser | `lib/supabase/client.ts` (`createBrowserClient`) | Client Components, client services |
| Server | `lib/supabase/server.ts` (wraps `cookies()`) | Server Components, Route Handlers |
| Proxy | `lib/supabase/factory.ts` (`createServerCookieClient`) | `lib/supabase/middleware.ts` |

The shared cookie plumbing lives in `lib/supabase/factory.ts`, so Server
Components, Route Handlers and the proxy don't each re-implement it.

All auth operations go through `services/auth.service.ts` (`authService`),
which wraps `supabase.auth.*` calls and returns a consistent `ApiResult`
(`types/api.ts`). Supabase errors are mapped to friendly messages in
`lib/supabase/errors.ts`.

### Routes

| Route | Public? | Purpose |
|---|---|---|
| `/login` | Yes | Sign in (email/password or Google) |
| `/signup` | Yes | Create an account |
| `/forgot-password` | Yes | Request a password reset email |
| `/reset-password` | Yes | Set a new password from a reset link (handles `?code=`, `?token_hash=`, hash fragments) |
| `/auth/callback` | Yes | Exchange a Supabase auth code / OTP token for a session |
| `/auth/confirm` | Yes | Verify a Supabase OTP token (`?token_hash=&type=`) |
| `/change-password` | Yes* | Change password (first-login forced or on demand) |
| `/dashboard/*` | No | Authenticated app |

`*` `/change-password` and `/reset-password` are public so a user following
an email reset link can still set a new password. Authenticated users with
`must_change_password` set are redirected to `/change-password` (recovery
links land on `/reset-password` instead).

`PUBLIC_ROUTES` is defined in `lib/supabase/middleware.ts`; any new public
page must be added there.

### Proxy protection

Next.js 16 renamed `middleware.ts` to `proxy.ts`. `proxy.ts` matches every
route except static assets and forwards to `updateSession` in
`lib/supabase/middleware.ts`, which:

1. **Rescues stray auth links**: a request with `?code=`, `?token_hash=` or
   `?error=` that isn't already on `/auth/callback`, `/auth/confirm` or
   `/reset-password` is redirected to `/auth/callback` (with
   `next=/reset-password` if no `next` is set). This covers Supabase falling
   back to the Site URL when the redirect allow-list isn't configured.
2. Creates a Supabase cookie client bound to the request.
3. Calls `auth.getUser()` to load the session. No code may run between client
   creation and this call.
4. **Unauthenticated + non-public route**: redirect to `/login?redirectTo=<path>`.
5. **Authenticated + visiting `/login` or `/`**: redirect to `/dashboard`.
6. **First-login flag set** (`user_metadata.must_change_password === true`)
   and not on `/change-password` or `/reset-password`: redirect to
   `/change-password`.
7. **Route-level RBAC**: if the path requires roles (see `lib/rbac.ts`) and
   the user's role is insufficient, redirect to `/dashboard`.

### Sign up

- `components/auth/SignupForm.tsx` uses `signupSchema`.
- `authService.signup({ fullName, email, password })` calls `auth.signUp`
  with `user_metadata = { full_name, must_change_password: false }`, so
  self-registered users skip the forced password change.
- `emailRedirectTo` is `/auth/callback?next=/login?confirmed=true`. If email
  confirmation is enabled no session is returned, and the user is told to
  check their email.

### Sign in

- `components/auth/LoginForm.tsx` (React Hook Form + Zod via `loginSchema`).
- `authService.login({ email, password })` calls `signInWithPassword`.
- On success the client redirects through
  `safeRedirect(searchParams.get("redirectTo"))` (defaults to `/dashboard`) and
  calls `router.refresh()` so the server component tree re-renders with the
  new session.
- `utils/safeRedirect.ts` only allows same-origin relative paths, preventing
  open-redirect attacks.

#### Google sign-in

"Continue with Google" calls `authService.signInWithGoogle(next)`, which runs
`supabase.auth.signInWithOAuth({ provider: "google" })` with
`redirectTo = /auth/callback?next=<redirectTo>`. The Google provider must be
enabled in Supabase → Authentication → Providers.

This is separate from the Classroom/Calendar link in
[google-integration.md](#5-google-integration): Google sign-in authenticates
the StudentHub account through Supabase, while the Classroom/Calendar link is
StudentHub's own OAuth flow with read-only API scopes and encrypted token
storage.

### First-login forced password change

- The profile trigger (`handle_new_user`) copies `must_change_password` from
  user metadata, defaulting to `true` when absent. Users created by an admin
  in the Supabase dashboard therefore get the forced change; self-signups set
  it to `false`.
- The proxy reads `user.user_metadata.must_change_password` and blocks entry
  to the app until the password is changed.
- `components/auth/ChangePasswordForm.tsx` calls
  `authService.changePassword({ newPassword })`, which runs
  `supabase.auth.updateUser({ password, data: { must_change_password: false } })`
  to clear the flag.
- The same page serves the "change password from Settings" flow; the header
  switches on `isFirstLogin` (`app/(auth)/change-password/page.tsx`).

### Password reset (forgot password)

1. `components/auth/ForgotPasswordForm.tsx` calls `authService.requestPasswordReset({ email })`.
2. That calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` with
   `redirectTo = ${window.location.origin}/auth/callback?next=/reset-password`.
3. The email link hits `/auth/callback`, which exchanges the code for a session
   (or verifies `token_hash`/`type` via `verifyOtp`) and redirects to
   `/reset-password`.
4. `app/(auth)/reset-password/page.tsx` + `components/auth/ResetPasswordForm.tsx`
   verify any leftover `?code=` / `?token_hash=` params client-side
   (`verifyRecoveryCode` / `verifyRecoveryToken`) and listen for
   `PASSWORD_RECOVERY` for hash-fragment links. The user then sets a new
   password via `authService.changePassword`.

For security the service always returns the generic message
"If an account exists for that email, a reset link is on its way." regardless
of whether the account exists.

The Supabase project must list the app URLs under Authentication → URL
Configuration (Site URL plus `http://localhost:3000/**` and
`https://<prod>/**` in Redirect URLs), or reset links fall back to the Site
URL and rely on the proxy's rescue step.

### Auth callback

`app/auth/callback/route.ts` handles the reset flow, email confirmation,
Google sign-in and any Supabase-generated auth code. It:

- Reads `code`, `token_hash`/`type`, an optional provider `error` /
  `error_description`, and an optional `next` param (`safeRedirect`-sanitized,
  default `/dashboard`).
- If Supabase returned an error without a code or token, redirects to `next`
  with the error params so the target page can explain it.
- Exchanges the code with `supabase.auth.exchangeCodeForSession(code)`, or
  verifies OTP links with `supabase.auth.verifyOtp({ token_hash, type })`.
- Redirects to `${origin}${next}` on success, or to `next` with
  `?error=auth-callback-failed` on failure. With no code or token it redirects
  to `/login?error=auth-callback-failed`.

`app/auth/confirm/route.ts` is a thin alias for OTP (`token_hash`) links,
defaulting `next` to `/reset-password`.

### Logout

`authService.logout()` calls `supabase.auth.signOut()`; the `useAuth` hook then
clears local user state and routes to `/login`.

### Client state

`hooks/useAuth.ts` hydrates the current user from `auth.getUser()`, subscribes
to `onAuthStateChange`, and exposes `{ user, isLoading, isAuthenticated, logout }`.
The `AuthUser` shape (`types/auth.ts`) maps `user_metadata.full_name`,
`avatar_url`, role (via `roleFromUser`), and the `must_change_password` flag.

### Role-based access control (RBAC)

Roles are modeled as a `public.user_role` enum: `student` (0) < `teacher` (1) <
`admin` (2).

#### Role source of truth

The `handle_new_user()` trigger writes the role to `profiles.role` and mirrors
it into `app_metadata.role` so it appears in the JWT. All access checks
resolve the role from `app_metadata` via `roleFromUser` in `lib/rbac.ts`
(default `student`), never from `user_metadata`, because `user_metadata` is
client-controllable and would allow a self-signed privilege escalation.
`app_metadata` is only writable via the service role / admin API.

#### Enforcement

The only enforcement point is the proxy (`lib/supabase/middleware.ts` +
`lib/rbac.ts`). `lib/rbac.ts` holds `ROUTE_ROLES`, a module-private array of
`{ prefix, roles }` pairs where the longest matching prefix wins. It is
currently empty, so every dashboard page is open to any authenticated user.

- `getRequiredRoles(path)` returns the required roles for a path, or `null` if
  the path is open.
- `hasRole(role, required)` compares ranks via `ROLE_RANK`.

There is no server-component guard or client role hook; add one alongside the
first staff-only route if needed.

### Password policy

Password rules live in `utils/validation.ts` (`PASSWORD_RULES`) and are
enforced by `passwordSchema` in `lib/validations/auth.ts`: at least 8
characters, one uppercase, one lowercase, one number. Signup and change
password also require the confirmation to match.

### Auth forms & schemas

| Form | Schema | File |
|---|---|---|
| Login | `loginSchema` | `lib/validations/auth.ts` |
| Signup | `signupSchema` | `lib/validations/auth.ts` |
| Forgot password | `forgotPasswordSchema` | `lib/validations/auth.ts` |
| Change / reset password | `changePasswordSchema` | `lib/validations/auth.ts` |

All forms use React Hook Form with `zodResolver` and the reusable UI
primitives in `components/ui/form.tsx`.

---

## 4. Data Model

The database is PostgreSQL on Supabase. Every user-owned table enables Row
Level Security (RLS) with owner-only policies, so a user can only read/write
their own rows.

Schema source of truth is `supabase/migrations/`: timestamped, incremental
migrations applied with the Supabase CLI (`npm run db:migrate`) or pasted in
order into the SQL Editor.

`supabase/schema.sql` (profiles + role enum) and `supabase/consolidated.sql`
(profiles + role enum + Google tables) are older single-file snapshots. They
do **not** include the tasks, schedule, focus, notes, study hub, wellness,
preferences or attachment migrations, so after running one of them you must
still apply the later migrations.

### TypeScript types

`types/database.types.ts` is generated from the live Supabase project via
`npm run typegen` and provides row/insert/update types for every table.

### Enums

| Enum | Values | Notes |
|---|---|---|
| `public.user_role` | `student`, `teacher`, `admin` | Ordered hierarchy in `lib/rbac.ts` (`ROLE_RANK`) |

### Tables

#### `profiles`

1:1 with `auth.users`; created automatically by the `on_auth_user_created`
trigger when a new auth user signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | references `auth.users(id)` on delete cascade |
| `full_name` | `text` | defaults to email when `full_name` metadata absent |
| `avatar_url` | `text` | |
| `role` | `user_role` | default `'student'`; read from `app_metadata` on insert |
| `must_change_password` | `boolean` | default `true`; copied from user metadata on insert (self-signups send `false`) |
| `timezone` | `text` | default `'UTC'` |
| `theme` | `text` | `light` / `dark` / `system` (default) |
| `default_calendar_view` | `text` | `month` (default) / `week` / `day` / `agenda` |
| `default_task_view` | `text` | `kanban` (default) / `list` |
| `notifications_enabled` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, maintained by trigger |

**RLS policies:** `Profiles are viewable by owner`, `Profiles are updatable by
owner` — `auth.uid() = id`.

**Index:** `profiles_role_idx (role)`.

**Triggers:** `on_auth_user_created` (after insert on `auth.users` →
`handle_new_user()`), `on_profiles_updated` (before update →
`handle_updated_at()`).

#### `google_accounts`

Holds the linked Google identity and encrypted OAuth tokens (one row per user).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` UNIQUE | references `profiles(id)` on delete cascade |
| `google_subject` | `text` UNIQUE | Google's opaque, stable user id (OpenID `sub`) |
| `email` | `text` | linked account email, display only |
| `access_token_enc` | `text` | AES-256-GCM ciphertext |
| `refresh_token_enc` | `text` | AES-256-GCM ciphertext |
| `token_expires_at` | `timestamptz` | |
| `needs_reconnect` | `boolean` | default `false`; set when a token refresh fails |
| `last_synced_at` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

#### `courses`

Classes from Google Classroom **or** manually created courses.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `google_course_id` | `text` | null for manual courses |
| `source` | `text` | `'classroom'` or `'manual'` (CHECK constraint), default `'manual'` |
| `name` | `text` | |
| `section` | `text` | |
| `room` | `text` | |
| `teacher_name` | `text` | set from the Classroom course owner for synced courses |
| `color` | `text` | |
| `credit_hours` | `numeric` | default `3.0`, CHECK `>= 0` |
| `manual_grade` | `numeric` | legacy GPA field; no longer used by the app |
| `target_pct` | `numeric` | legacy per-course grade goal (0–100); no longer used by the app |
| `course_code` | `text` | short code such as `CS101` |
| `course_name` | `text` | canonical name; backfilled from and kept in sync with `name` |
| `instructor` | `text` | canonical instructor; backfilled from and kept in sync with `teacher_name` |
| `description` | `text` | |
| `archived` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_course_id)` — PostgreSQL allows multiple NULLs,
so several manual courses (no `google_course_id`) are permitted.

**Indexes:** `courses_user_archived_idx (user_id, archived)`.

#### `assignments`

Classroom course work (per course), including due dates, points, and grades.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete cascade |
| `google_course_work_id` | `text` | null for manual assignments |
| `title` | `text` | |
| `description` | `text` | |
| `due_at` | `timestamptz` | |
| `max_points` | `numeric` | CHECK `> 0` when present |
| `grade` | `numeric` | earned points; null until graded |
| `submitted` | `boolean` | default `false` |
| `state` | `text` | raw Classroom submission state (e.g. `TURNED_IN`) |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_course_work_id)`.

**Indexes:** `assignments_user_due_idx (user_id, due_at)`,
`assignments_course_idx (course_id)`.

#### `announcements`

Classroom stream announcements per course.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete cascade |
| `google_announcement_id` | `text` | |
| `text` | `text` | |
| `creator_name` | `text` | |
| `publish_time` | `timestamptz` | actual announcement creation time |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_announcement_id)`.

**Indexes:** `announcements_user_publish_idx (user_id, publish_time desc)`.

#### `calendar_events`

Snapshot of the linked Google Calendar for a rolling window (replaced
wholesale on each sync).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `google_event_id` | `text` | stable Google event id (`ephemeral-*` for malformed events) |
| `summary` | `text` | |
| `description` | `text` | |
| `location` | `text` | |
| `start_at` | `timestamptz` | |
| `end_at` | `timestamptz` | |
| `all_day` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_event_id)`.

**Indexes:** `calendar_events_user_start_idx (user_id, start_at)`.

#### `schedule_events`

User-created calendar entries (full CRUD). Separate from `calendar_events`,
which is the read-only Google snapshot that each sync replaces.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title` | `text` | |
| `description`, `location`, `color` | `text` | |
| `event_type` | `text` | `class` / `assignment` / `exam` / `study_session` / `personal` / `other` (default) |
| `start_at`, `end_at` | `timestamptz` | CHECK `end_at > start_at` |
| `all_day` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, start_at)`, `(user_id, course_id)`,
`(user_id, event_type)`, `(user_id, event_type, start_at)`.

#### `tasks`

To-Do Tracker items.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title`, `description` | `text` | |
| `status` | `text` | `todo` (default) / `in_progress` / `done` |
| `priority` | `text` | `urgent` / `high` / `medium` (default) / `low` |
| `tags` | `text[]` | default `{}` |
| `due_at` | `timestamptz` | |
| `estimate_minutes` | `integer` | `> 0` when set |
| `recurrence_freq` | `text` | null / `daily` / `weekly` / `monthly` |
| `recurrence_interval` | `integer` | 1–31, default 1 |
| `recur_until` | `timestamptz` | |
| `sort_order` | `integer` | manual ordering within a column |
| `completed_at` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, status)`, `(user_id, due_at)`,
`(user_id, status, completed_at)`.

#### `focus_sessions`

Completed Pomodoro/focus sessions.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `duration_minutes` | `integer` | 1–480 |
| `started_at`, `ended_at` | `timestamptz` | |
| `task_id` | `uuid` | references `tasks(id)` on delete set null |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `created_at` | `timestamptz` | |

**Indexes:** `(user_id, started_at desc)`, `(user_id, task_id)`.

#### `notes`

Study Hub notes (Markdown content).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title` | `text` | |
| `content` | `text` | |
| `favorite` | `boolean` | default `false` |
| `tags` | `text[]` | default `{}` (GIN-indexed) |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, created_at desc)`, `(user_id, updated_at desc)`,
`(user_id, course_id)`, `(user_id, favorite)`, GIN on `tags`.

#### `note_attachments`

PDF files attached to notes. The file itself lives in the private
`notes-pdfs` Storage bucket under `<user_id>/...`; `file_url` holds the
storage path, and the UI creates short-lived signed URLs to open it.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `note_id` | `uuid` | references `notes(id)` on delete cascade |
| `file_url` | `text` | storage object path |
| `file_name` | `text` | original file name |
| `created_at` | `timestamptz` | |

RLS has select/insert/delete owner policies (no update). Storage policies on
`storage.objects` restrict `notes-pdfs` objects to paths whose first folder is
the caller's `auth.uid()`.

#### `flashcards`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `note_id` | `uuid` | references `notes(id)` on delete set null |
| `front`, `back` | `text` | |
| `tags` | `text[]` | default `{}` |
| `is_known` | `boolean` | default `false` |
| `correct_count`, `incorrect_count` | `integer` | default `0` |
| `last_reviewed` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

#### `quizzes`, `quiz_questions`, `quiz_attempts`

| Table | Key columns | Notes |
|---|---|---|
| `quizzes` | `user_id`, `course_id`, `title`, `description` | owner RLS on `user_id` |
| `quiz_questions` | `quiz_id` (cascade), `question_text`, `question_type` (`multiple_choice` / `true_false` / `short_answer`), `options jsonb`, `correct_answer`, `explanation`, `position` | no `user_id`; RLS checks ownership of the parent quiz |
| `quiz_attempts` | `quiz_id` (cascade), `user_id`, `answers jsonb`, `score`, `total`, `created_at` | select/insert only; the quiz owner can also read attempts |

#### `wellness_entries`

Daily mood check-in and journal (habit data, not medical data). One row per
user per day.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `entry_date` | `date` | default `current_date`; UNIQUE with `user_id` (upsert key) |
| `mood` | `smallint` | 1–5 |
| `journal` | `text` | |
| `created_at` / `updated_at` | `timestamptz` | |

#### `academic_settings` (unused)

Created by the Google academics migration for the removed GPA feature
(`grade_scale jsonb`, `target_gpa numeric`, one row per user). No application
code reads or writes it anymore.

### Row Level Security

Every user-owned table enables RLS. Tables with a `user_id` column have
owner-only policies keyed on `auth.uid() = user_id`, typically all four of
select/insert/update/delete:

```
create policy "courses owner select" on public.courses for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses for update using (auth.uid() = user_id);
create policy "courses owner delete" on public.courses for delete using (auth.uid() = user_id);
```

Exceptions: `profiles` has select/update policies keyed on `auth.uid() = id`;
`quiz_questions` checks ownership through its parent quiz; `quiz_attempts`
and `note_attachments` have no update policy.

### Functions & triggers

| Function | Trigger | Fires on | Purpose |
|---|---|---|---|
| `handle_new_user()` | `on_auth_user_created` | after insert on `auth.users` | Creates the profile row (`full_name`, `must_change_password` from user metadata); reads role from `app_metadata` (default `student`) and mirrors it back into `app_metadata` so it appears in the JWT |
| `handle_updated_at()` | `on_<table>_updated` | before update | Sets `updated_at = now()` on tables with an `updated_at` column |

Note on `handle_new_user`: the role is read from `raw_app_meta_data`
(admin/service-role only), never `user_metadata`, which is client-controllable
and would allow a self-signed privilege escalation.

### Migration history

| Migration | Contents |
|---|---|
| `20260811000001_init_profiles.sql` | `profiles` table, RLS, `handle_new_user`/`handle_updated_at` triggers |
| `20260811000002_add_role_enum.sql` | `user_role` enum, re-points `profiles.role`, role-aware trigger, `profiles_role_idx` |
| `20260813000001_google_academics.sql` | `google_accounts`, `courses`, `assignments`, `announcements`, `calendar_events`, `academic_settings` |
| `20260815000001_add_course_target_pct.sql` | `courses.target_pct` (now unused) |
| `20260816000001_create_tasks.sql` | `tasks` |
| `20260822000001_add_course_management_fields.sql` | `courses.course_code`, `course_name`, `instructor`, `description` + backfill |
| `20260823000001_create_schedule_events.sql` | `schedule_events` |
| `20260824000001_create_focus_and_notes.sql` | `focus_sessions`, `notes` |
| `20260825000001_create_study_hub.sql` | `notes.favorite`/`tags`, `flashcards`, `quizzes`, `quiz_questions`, `quiz_attempts` |
| `20260826000001_create_wellness_entries.sql` | `wellness_entries` |
| `20260827000001_add_profile_preferences.sql` | `profiles` timezone/theme/default views/notifications |
| `20260906000001_perf_indexes.sql` | Composite indexes for sorted/filtered queries |
| `20260907000003_note_attachments.sql` | `note_attachments`, private `notes-pdfs` Storage bucket + policies |

After adding a migration, run `npm run typegen` to regenerate
`types/database.types.ts`.

---

## 5. Google Integration

StudentHub integrates with **Google Classroom** and **Google
Calendar** through a server-side OAuth 2.0 **authorization-code + PKCE** flow
with read-only scopes. Google data is pulled on demand into a local Supabase
cache; pages never call Google per page load.

This is separate from **Google sign-in** (Supabase OAuth provider, see
[auth.md](#3-authentication--rbac)). Signing in with Google does not grant
Classroom/Calendar access; the user links it separately from the dashboard
banner or Settings.

### Architecture

```
Settings / dashboard banner → "Connect Google" → GET /api/google/auth
    sets httpOnly cookies: google_oauth_state, google_oauth_verifier
    redirects to Google consent screen
        ▼
Google redirects to GET /api/google/callback?code=...&state=...
    validates state (CSRF)
    exchanges code + PKCE verifier for tokens
    encrypts tokens (AES-256-GCM) → google_accounts
    triggers an initial sync
        ▼
POST /api/dashboard/sync  (Sync Now button)
    refreshes token if near expiry
    pulls Classroom courses/courseWork/announcements + rolling Calendar window
    upserts into courses, assignments, announcements, calendar_events
```

### OAuth flow details

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

### Token storage & encryption

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

### Token refresh

`getValidAccessToken` (`services/google.service.ts`):

- If `token_expires_at` is more than 60s in the future, the stored access token
  is decrypted and reused.
- Otherwise the refresh token is decrypted, exchanged via
  `refreshToken` (`lib/google/tokens.ts`), and the new access token (and any new
  refresh token) are re-encrypted and persisted.
- If a refresh fails, `needs_reconnect` is set on the account and the UI shows a
  "reconnect" banner.

### Sync pipeline

`syncGoogleData(userId)` (`services/google.service.ts`) is the single entry
point (called by `POST /api/dashboard/sync` and, best-effort, after the OAuth
callback). It is idempotent and safe to re-run.

1. Loads the `google_accounts` row; fails gracefully if missing or flagged
   `needs_reconnect`.
2. Obtains a valid access token (reuse or refresh).
3. **Courses** — `listCourses` (active courses only) → upserted into `courses`
   with `source='classroom'` and `credit_hours=3`,
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

#### Error mapping

`mapSyncError` (`services/google.service.ts`) maps HTTP statuses to friendly
messages: `429` → rate-limited, `403` → account lacks access, `401` → session
expired (also marks `needs_reconnect`). `GoogleHttpError` (`lib/google/tokens.ts`)
carries the status so callers can branch. On failure the existing cache is kept
so the dashboard still renders.

### Google API clients

| Client | File | Endpoints |
|---|---|---|
| Classroom | `services/classroom.service.ts` | `courses` (ACTIVE), `courses/{id}/courseWork`, `courses/{id}/courseWork/{id}/studentSubmissions`, `courses/{id}/announcements` — each with a `pageToken` pagination loop |
| Calendar | `services/calendar.service.ts` | `calendars/primary/events` with `singleEvents=true`, `orderBy=startTime`, `maxResults=250`, rolling `timeMin`/`timeMax` |

Both use `googleFetch` (`lib/google/tokens.ts`), an authenticated GET helper
that throws `GoogleHttpError` on non-2xx responses.

### Typed Google payloads

`types/google.ts` defines narrow, typed views of the consumed Google API
responses (`GoogleCourse`, `GoogleCourseWork`, `GoogleStudentSubmission`,
`GoogleAnnouncement`, `GoogleCalendarEvent`, token/userinfo responses) so the
sync layer is robust against fields Google adds that StudentHub doesn't care
about.

### Reads (no Google)

Pages read only the Supabase cache:

- `services/dashboard.service.ts` (`getProductivityDashboardData`) merges
  `assignments`, `announcements` and `calendar_events` with the user's own
  tasks and `schedule_events` for the dashboard cards.
- `services/schedule.service.ts` shows `calendar_events` as read-only entries
  next to editable `schedule_events`.
- `services/academics.service.ts` (`getGoogleAccountView`) powers the Settings
  connection card.

The cache is considered **stale** 12 hours after `last_synced_at`, which makes
the dashboard's `SyncNowCard` nudge the user to sync.

### Disconnecting

`academicsClientService.disconnectGoogle()` deletes the user's `courses`
(cascading to `assignments` and `announcements`), `calendar_events`, and the
`google_accounts` row — removing all cached Google data while keeping the
StudentHub account.

---

## 6. API Routes

Next.js Route Handlers used by StudentHub. All route handlers create a
server-side Supabase client (`lib/supabase/server.ts`) and rely on RLS for
authorization at the row level; handlers that act on the current user check the
session explicitly via `auth.getUser()`.

### `/auth/callback`

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
paths to this route (see [auth.md](#3-authentication--rbac)).

### `/auth/confirm`

| | |
|---|---|
| Method | `GET` |
| File | `app/auth/confirm/route.ts` |
| Auth | None (public) |
| Purpose | Supabase-recommended OTP endpoint; thin alias of `/auth/callback` for `token_hash` links, with `next` defaulting to `/reset-password` |

### `/api/google/auth`

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

### `/api/google/callback`

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

### `/api/dashboard/sync`

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

### AI routes

All five routes live under `app/api/ai/` and share the same shape:

- `POST` with a JSON body; session required (`401` otherwise), `400` on
  invalid JSON or missing input.
- Where a `noteId` is accepted, the note is loaded with
  `.eq("user_id", user.id)` (`404` if not found) and its content replaces
  `content`. Content is truncated to 6000 characters in the prompt.
- The prompt goes to `callAI(prompt, system)` in `lib/ai/provider.ts`, which
  picks the first configured provider (`OPENAI_API_KEY`/`AI_API_KEY`, then
  `ANTHROPIC_API_KEY`, then `GOOGLE_AI_API_KEY`/`GEMINI_API_KEY`) and aborts
  after 4.5 seconds.
- Errors: `503` when no provider is configured, `502` for provider errors,
  timeouts or unparseable JSON output. Responses are
  `{ success, message?, data? }`.

| Route | Body | `data` on success |
|---|---|---|
| `/api/ai/explain` | `{ concept, courseId? }` | `{ explanation }` |
| `/api/ai/summarize` | `{ noteId?, content?, title? }` (content ≥ 20 chars) | `{ summary, title }` |
| `/api/ai/generate-flashcards` | `{ noteId?, content?, count? }` (content ≥ 30 chars, count 1–10, default 5) | `{ flashcards: { front, back }[] }` |
| `/api/ai/generate-quiz` | `{ noteId?, content?, count?, title? }` (content ≥ 30 chars, count 1–8, default 5) | `{ questions: { question_text, question_type, options?, correct_answer, explanation }[] }` |
| `/api/ai/study-plan` | `{ topic, courseId?, durationDays? }` (1–30, default 7) | `{ plan, topic, durationDays }` |

The routes only generate content; saving flashcards/quizzes happens
client-side through `flashcardsClientService` / `quizzesClientService`.

### Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/callback` | GET | none | Exchange Supabase auth code / OTP token for session |
| `/auth/confirm` | GET | none | OTP-link alias of `/auth/callback` |
| `/api/ai/*` | POST | session | Explain, summarize, generate flashcards/quizzes, study plans |
| `/api/google/auth` | GET | session | Start Google OAuth consent flow |
| `/api/google/callback` | GET | session | Finalize Google link + initial sync |
| `/api/dashboard/sync` | POST | session | Pull Google data into the Supabase cache |

---

## 7. Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers: task scheduling, RBAC, Zod schemas,
Supabase error mapping, and utility functions.

### Running tests

```bash
npm test                                  # run once (vitest run)
npm run test:watch                        # watch mode
npx vitest run lib/scheduling.test.ts     # a single file
npx vitest run -t "nextRecurrence"        # tests whose name matches
```

### Configuration

| File | Purpose |
|---|---|
| `vitest.config.mts` | `jsdom` environment, `@` → repo root alias, globals, setup file, includes `**/*.test.{ts,tsx}` |
| `vitest.setup.ts` | Imports `@testing-library/jest-dom/vitest` (custom matchers) |

### Test files

| File | Area under test |
|---|---|
| `lib/scheduling.test.ts` | `buildSchedule` min-heap ordering, `nextRecurrence`, `formatRecurrenceLabel` |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, signup, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Manual course Zod schema |
| `lib/validations/tasks.test.ts` | `taskFormSchema`, `taskFormToDraft`, `toLocalInputValue` |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `utils/cn.test.ts` | `cn()` class-name merging |
| `utils/safeRedirect.test.ts` | Open-redirect prevention in redirect targets |
| `utils/validation.test.ts` | Email validation, password strength rules, initials helper |

### What the tests verify

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

### Coverage notes

Tests currently target the pure/validation layers only. The service layer
(`services/*`), route handlers (including `/api/ai/*`), and React components
are not unit-tested yet; the pure functions they depend on are.

---

## 8. Deployment

### Environment variables

Copy `.env.local.example` to `.env.local` for local development. Never commit
real values.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `GOOGLE_CLIENT_ID` | Google features only | Google OAuth client ID (`...apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Google features only | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google features only | Must match an authorized redirect URI on the OAuth client (e.g. `https://<domain>/api/google/callback`) |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Google features only | Used to AES-256-GCM encrypt Google tokens at rest |
| `OPENAI_API_KEY` (or `AI_API_KEY`) | AI features only | OpenAI-compatible key; optional `OPENAI_BASE_URL`, `AI_MODEL` / `OPENAI_MODEL` (default `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` | AI alternative | Used if no OpenAI key is set; optional `ANTHROPIC_MODEL` |
| `GOOGLE_AI_API_KEY` (or `GEMINI_API_KEY`) | AI alternative | Used if neither of the above is set; optional `GOOGLE_AI_MODEL` |

Generate the token encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app runs without the Google variables unless the Classroom/Calendar
integration is used; the OAuth config helper (`lib/google/tokens.ts`) fails
fast with a descriptive message when they're missing.

The AI variables are checked in order (OpenAI, then Anthropic, then Google)
by `lib/ai/provider.ts`; the first key found wins. Without any of them the
Study Hub AI features return a "not configured" error (HTTP 503).

### Supabase setup

1. Create a Supabase project at <https://supabase.com/>.
2. Set the two `NEXT_PUBLIC_SUPABASE_*` variables.
3. Apply the schema from `supabase/migrations/`:
   - **CLI:** `npm run db:migrate` (requires the Supabase CLI linked to the
     project).
   - **SQL Editor:** paste each migration file in timestamp order.
   `supabase/schema.sql` and `supabase/consolidated.sql` are older snapshots
   that stop at the Google tables; don't use them on their own.
   The last migration also creates the private `notes-pdfs` Storage bucket
   used for note PDF attachments.
4. **Authentication → URL Configuration:** set the Site URL
   (`http://localhost:3000` in dev, your production URL in prod) and add
   `http://localhost:3000/**` and `https://<your-domain>/**` to Redirect URLs.
   Without this, password-reset and confirmation links fall back to the Site
   URL (the proxy rescues them, but the allow-list is the proper fix).
5. **Authentication → Providers → Google** (optional): enable it for
   "Continue with Google" sign-in. This uses its own OAuth client, with
   Supabase's callback URL
   (`https://<project-ref>.supabase.co/auth/v1/callback`) as the redirect URI.
6. `npm run typegen` regenerates `types/database.types.ts` from the project
   (requires the CLI).

#### Creating a test user with the first-login flow

In Supabase → Authentication → Users → "Add user", create a user with
email/password and set `must_change_password: true` in the user's metadata
(JSON) to exercise the forced password-change flow.

### Google Cloud setup (once per environment)

The Classroom/Calendar integration uses a server-side OAuth 2.0 flow with read-only scopes.
Set it up once per environment:

1. Go to <https://console.cloud.google.com/> and create a project (or reuse one).
2. From **APIs & Services → Library**, enable:
   - **Google Cloud Classroom API**
   - **Google Calendar API**
3. **APIs & Services → OAuth consent screen → External → Create.**
   - Add an app name and support email, and (mandatory for testing) add your
     own email under **Test users**. Classroom reads won't show for non-test
     users until the app is verified/published.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application.**
   - Authorized JavaScript origins: `http://localhost:3000`,
     `https://<your-domain>`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/google/callback` (dev)
     - `https://<your-domain>/api/google/callback` (prod)
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `GOOGLE_REDIRECT_URI` for the corresponding environment.
6. Set `GOOGLE_TOKEN_ENCRYPTION_KEY` (see above). Rotating it invalidates
   stored tokens; users simply reconnect.

Apply the Google data tables once (not on every deploy):

```bash
npm run db:migrate   # pushes supabase/migrations/, incl. google_academics
```

### Vercel deployment

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository.
3. Under **Settings → Environment Variables**, add the variables from the table
   above (set `GOOGLE_REDIRECT_URI` to the production callback URL and update
   the Google Cloud authorized redirect URIs accordingly).
4. Deploy. The production build runs `next build` automatically
   (`npm run build`).

### Production build

```bash
npm run build
npm start
```

The build runs TypeScript type checking. Next.js 16 no longer runs ESLint
during `next build`, so run `npm run lint` separately (e.g. in CI). `next.config.mjs` enables
`reactStrictMode` and allows images from the Supabase storage hostname
(`cbdxebzizvgzoupdplvs.supabase.co`); update the remote pattern if you use a
different Supabase project host.

### Notes & caveats

- **Secrets:** `NEXT_PUBLIC_*` vars are public (embedded in the client bundle);
  keep the anon key, not the service role key. `GOOGLE_*` and AI key vars are
  server-only.
- **Google quota:** sync is on-demand and respects Google's rate limits; a
  `429` surfaces as a friendly message.
- **Token rotation:** rotating `GOOGLE_TOKEN_ENCRYPTION_KEY` invalidates all
  stored Google tokens — users must reconnect.
- **Database migrations** should be applied before/after deploy as needed;
  `npm run db:migrate` is not part of the build.
