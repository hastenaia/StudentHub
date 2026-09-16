# StudentHub — Project Documentation

Your all-in-one student management platform: courses, schedules, grades, and
academic life organized and always in sync.

StudentHub aggregates a student's Google Classroom and Google Calendar into a
single, private academic dashboard with a live GPA projection. It is built on
Next.js (App Router) with a Supabase backend (Auth, PostgreSQL, Row Level
Security).

> Phase 1.5 — Foundation, Authentication, and the Academic Dashboard
> (Google Classroom + Calendar integration with GPA math).

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

- **Authentication** — email/password sign in, session persistence via
  cookies, password reset, and a forced first-login password change.
- **Role-based access control** — `student` / `teacher` / `admin` roles
  enforced in middleware and server components.
- **Academic Dashboard** — server-rendered overview of courses, upcoming
  assignments, announcements, calendar events, and a GPA card.
- **Google integration** — read-only OAuth 2.0 (PKCE) link to Google Classroom
  and Google Calendar, with on-demand sync into a local Supabase cache.
- **GPA calculator** — pure, unit-tested math for grade-scale conversion,
  weighted GPA, and goal projections (`lib/gpa.ts`).
- **Settings** — manage the Google connection, grading scale + target GPA, and
  manually tracked courses that aren't on Google Classroom.
- **Responsive UI** — Tailwind CSS design system, Framer Motion animations,
  skeleton loading states, and toast notifications.

### Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS, class-variance-authority, tailwind-merge |
| Animations | Framer Motion |
| Icons | lucide-react |
| Forms | react-hook-form + zod (`@hookform/resolvers`) |
| Backend | Supabase (Auth, PostgreSQL, RLS, Storage) |
| Testing | Vitest + Testing Library (jsdom) |
| Linting | ESLint (`eslint-config-next`, flat config) |

Exact dependency versions are pinned in `package.json` / `package-lock.json`.

### Setup

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase project
values. Never commit real keys.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Google OAuth variables are only required when using the Academic Dashboard
integration (see [Google Integration](#5-google-integration)).

### Set up the database

Run `supabase/schema.sql` in the Supabase SQL Editor (or apply the timestamped
migrations with the Supabase CLI). This creates the `profiles` table with Row
Level Security, a trigger that auto-creates a profile on signup, and the
`must_change_password` flag.

Apply the Google data tables once per environment:

```bash
npm run db:migrate   # pushes supabase/migrations/, incl. google_academics
```

### Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` — unauthenticated visitors are redirected to
`/login`.

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

---

## 2. Architecture

### Overview

StudentHub is a Next.js App Router application with a Supabase backend. Pages
are Server Components that read a Supabase cache; a single route handler
(`POST /api/dashboard/sync`) is the only code path that talks to Google. This
keeps page loads fast, deterministic, and immune to flaky third-party APIs.

```
Browser
  │  Next.js middleware (lib/supabase/middleware.ts)
  │    • refresh session cookie
  │    • redirect unauthenticated users
  │    • force first-login password change
  │    • enforce route-level RBAC
  ▼
Server Components (app/**/page.tsx)
  │  lib/supabase/server.ts ──► Supabase (RLS-protected cache tables)
  │  services/academics.service.ts  (view assembly + GPA math)
  ▼
User → "Sync now" button ──► POST /api/dashboard/sync ──► Google APIs
                                    (the only Google caller)
```

### Directory map

```
app/
  (auth)/                Public auth routes (login, forgot-password, change-password)
  (dashboard)/           Authenticated app shell + pages
  auth/callback/         Route handler exchanging a Supabase auth code for a session
  api/
    google/auth/         Starts the Google OAuth consent flow
    google/callback/     Receives the Google redirect, stores tokens, initial sync
    dashboard/sync/      On-demand sync of Google data into the cache
  layout.tsx             Root layout: fonts, ToastProvider, Toaster
  error.tsx              Root error boundary
  not-found.tsx          404 page
components/
  ui/                    Reusable primitives (Button, Input, Card, Form, Toaster, ...)
  layout/                Sidebar, MobileSidebar, Navbar, DashboardShell
  auth/                  LoginForm, ForgotPasswordForm, ChangePasswordForm
  dashboard/             Dashboard cards (TodayOverview, CourseSnapshot, GPA card, ...)
  settings/              Google connection, academic settings, manual courses
  common/                ErrorBoundary, Skeletons, ComingSoon
hooks/                   useAuth, useToast, useMediaQuery, useRole
lib/
  supabase/              Browser client, server client, middleware helper, error mapping
  rbac.ts                Role hierarchy + route-level access map
  requireRole.ts         Server-side role guard (redirects)
  gpa.ts                 Pure GPA + projection math (unit-tested)
  google/                OAuth token mechanics + AES-256-GCM token encryption
  validations/           Zod schemas (auth, academics)
services/
  auth.service.ts        All Supabase Auth calls (client-side)
  academics.service.ts   Server-side dashboard view assembly
  academicsClient.service.ts  Client-side academic writes (manual courses, settings)
  google.service.ts      Google facade: OAuth storage + sync pipeline
  classroom.service.ts   Thin Google Classroom API client (pagination)
  calendar.service.ts    Thin Google Calendar API client (rolling window)
types/                   Database + domain + API result types
utils/                   cn(), validation + date helpers (+ unit tests)
middleware.ts            Next middleware entry point (matcher config)
supabase/
  schema.sql             Consolidated schema for fresh setups
  migrations/            Timestamped migration files (offline-managed)
```

### Request lifecycle

1. **Middleware** (`middleware.ts` → `lib/supabase/middleware.ts`) runs on every
   request. It creates a Supabase cookie client from the incoming request,
   calls `auth.getUser()`, then applies four checks in order:
   - unauthenticated + non-public route → redirect to `/login?redirectTo=<path>`
   - authenticated + visiting `/login` or `/` → redirect to `/dashboard`
   - `must_change_password === true` in user metadata and not on
     `/change-password` → redirect to `/change-password`
   - route requires roles and the user lacks them → redirect to `/dashboard`
2. **Server Component** (`app/(dashboard)/dashboard/page.tsx`) reads the user
   and calls `getDashboardData(userId)` + `getAcademicSettings(userId)` from
   `services/academics.service.ts`. All reads go to Supabase; the service
   assembles view models and runs the pure GPA math from `lib/gpa.ts`.
3. **Client interactions** (manual course edits, settings, sync button) call
   `services/academicsClient.service.ts` or `POST /api/dashboard/sync`, then
   `router.refresh()` re-renders the Server Component tree with fresh data.

### Client vs. server

| Concern | Server | Client |
|---|---|---|
| Supabase client | `lib/supabase/server.ts` (via `cookies()`) | `lib/supabase/client.ts` (`createBrowserClient`) |
| Middleware session | `lib/supabase/factory.ts` (cookie adapter) | — |
| Auth calls | — | `services/auth.service.ts` |
| Dashboard data | `services/academics.service.ts` | — |
| Academic writes | — | `services/academicsClient.service.ts` |
| Google network calls | `services/google.service.ts` (route handlers only) | — |

The shared cookie plumbing for server clients lives in
`lib/supabase/factory.ts` (`createServerCookieClient`), so Server Components,
Route Handlers, and middleware all use the same `@supabase/ssr`
`createServerClient` wiring.

### Modules

**Authentication & RBAC** — Email/password sign in and password reset via
Supabase Auth (`services/auth.service.ts`). Session persistence via SSR-safe
cookies refreshed in middleware. First-login forced password change driven by
the `must_change_password` flag. Role model: `public.user_role` enum
(`student` / `teacher` / `admin`), a role-rank hierarchy in `lib/rbac.ts`, a
route-level access map, a server guard (`lib/requireRole.ts`), and a client
hook (`hooks/useRole.ts`). The role is always read from `app_metadata`
(JWT-backed, admin-only writable) — never from client-controllable
`user_metadata`.

**Academic dashboard** — Server-rendered from the Supabase cache
(`services/academics.service.ts`). GPA projection math is pure functions in
`lib/gpa.ts`, unit-tested with Vitest. The sync endpoint is the only Google
caller; it upserts courses, assignments, announcements, and a rolling calendar
window.

**Settings** — Google connection management
(`components/settings/GoogleConnectionCard.tsx`), academic settings (grading
scale presets + target GPA, `AcademicSettingsCard.tsx`), and manual course CRUD
for courses not on Google Classroom (`ManualCoursesCard.tsx`).

**Placeholders** — none currently; active modules are `courses`, `schedule`, `tasks`, `notes`, `analytics`, `wellness`, `achievements`, `focus` (the former `students` placeholder has been removed).

### Data flow notes

- The dashboard never calls Google per page load — it reads only the Supabase
  cache tables.
- `POST /api/dashboard/sync` is the sole path that contacts Google for the
  signed-in user; it is idempotent and safe to re-run.
- Google OAuth tokens are encrypted at rest (AES-256-GCM) before being stored
  in `google_accounts` (`lib/google/crypto.ts`); the plaintext never touches
  Postgres or the browser.

### Design system

Tokens are defined in `tailwind.config.ts` under `theme.extend.colors.brand`
and mapped to Tailwind utilities (e.g. `bg-brand-royal`, `text-brand-dark`).

| Token | Value |
|---|---|
| Royal Blue (primary) | `#0033A0` |
| Royal Blue dark | `#002478` |
| Sky Blue (accent) | `#87CEEB` |
| White | `#FFFFFF` |
| Gray (surface) | `#F4F6F9` |
| Dark (text) | `#1A1A1A` |

Additional Tailwind color roles (primary/secondary/muted/accent/card) map onto
these brand values; `border`/`input`/`ring`/`background`/`foreground` use CSS
variables from `app/globals.css`. The Inter font is loaded via
`next/font/google` and exposed as `--font-inter`. Border radius scale is
0.375/0.5/0.75rem, and two animations are defined: `accordion-down/up` and
`fade-in`. Fully responsive across desktop, tablet, and mobile, with a
collapsible mobile sidebar, skeleton loading states, and toast notifications.

---

## 3. Authentication & RBAC

StudentHub uses **Supabase Auth** with email/password sign-in. Sessions are
stored in HTTP-only cookies managed through `@supabase/ssr` and refreshed in
Next.js middleware on every request.

### Session management

Three Supabase clients exist, all typed against `types/database.types.ts`:

| Client | File | Where it's used |
|---|---|---|
| Browser | `lib/supabase/client.ts` (`createBrowserClient`) | Client Components |
| Server | `lib/supabase/server.ts` (wraps `cookies()`) | Server Components, Route Handlers |
| Middleware | `lib/supabase/factory.ts` (`createServerCookieClient`) | Next.js middleware |

The shared cookie plumbing for server-side usage lives in
`lib/supabase/factory.ts`, so Server Components, Route Handlers, and middleware
don't each re-implement it.

All auth operations go through `services/auth.service.ts` (`authService`),
which wraps `supabase.auth.*` calls and returns a consistent `ApiResult`
(`types/api.ts`). Supabase errors are mapped to friendly messages in
`lib/supabase/errors.ts`.

### Routes

| Route | Public? | Purpose |
|---|---|---|
| `/login` | Yes | Sign in |
| `/forgot-password` | Yes | Request a password reset email |
| `/auth/callback` | Yes | Exchange a Supabase auth code for a session |
| `/change-password` | Yes* | Change password (first-login forced or on demand) |
| `/dashboard/*` | No | Authenticated app |

`*` `/change-password` is public so an unauthenticated user who follows the
email reset link can still set a new password; authenticated users with
`must_change_password` set are redirected here too.

`PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth/callback", "/change-password"]`
is defined in `lib/supabase/middleware.ts`.

### Middleware protection

`middleware.ts` matches all routes except static assets and forwards to
`updateSession` in `lib/supabase/middleware.ts`. The middleware:

1. Creates a Supabase cookie client bound to the request.
2. Calls `auth.getUser()` to load the session.
3. **Unauthenticated + non-public route** → redirect to `/login?redirectTo=<path>`.
4. **Authenticated + visiting `/login` or `/`** → redirect to `/dashboard`.
5. **First-login flag set** (`user_metadata.must_change_password === true`) and
   not already on `/change-password` → redirect to `/change-password`.
6. **Route-level RBAC** — if the path requires roles (see `lib/rbac.ts`) and
   the user's role is insufficient → redirect to `/dashboard`.

### Sign in

- `components/auth/LoginForm.tsx` (React Hook Form + Zod via `loginSchema`).
- `authService.login({ email, password })` calls `signInWithPassword`.
- On success the client redirects through `safeRedirect(searchParams.get("redirectTo"))`
  (defaults to `/dashboard`) and calls `router.refresh()` so the server
  component tree re-renders with the new session.
- `utils/safeRedirect.ts` only allows same-origin relative paths, preventing
  open-redirect attacks.

### First-login forced password change

- When a user is created, the profile trigger defaults
  `must_change_password` to `true` (see `supabase/schema.sql`).
- Middleware reads `user.user_metadata.must_change_password` and blocks entry
  to the app until the password is changed.
- `components/auth/ChangePasswordForm.tsx` calls
  `authService.changePassword({ newPassword })`, which runs
  `supabase.auth.updateUser({ password, data: { must_change_password: false } })`
  to clear the flag, then the user can access `/dashboard`.
- The same page serves the "change password from Settings" flow; the page
  header switches based on whether `isFirstLogin` is true
  (`app/(auth)/change-password/page.tsx`).

### Password reset (forgot password)

1. `components/auth/ForgotPasswordForm.tsx` → `authService.requestPasswordReset({ email })`.
2. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where
   `redirectTo` is `${window.location.origin}/auth/callback?next=/change-password`.
3. The email link hits `/auth/callback`, which exchanges the code for a session
   and redirects to the `next` target (`/change-password`).
4. The user sets a new password and is signed in.

For security the service always returns the generic message
"If an account exists for that email, a reset link is on its way." regardless
of whether the account exists.

### Auth callback

`app/auth/callback/route.ts` handles both the reset flow and any
Supabase-generated auth code. It:

- Reads `code` and an optional `next` param (`safeRedirect`-sanitized).
- Exchanges the code for a session with `supabase.auth.exchangeCodeForSession(code)`.
- Redirects to `${origin}${next}` on success, or `/login?error=auth-callback-failed`
  otherwise.

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

**Role source of truth** — The role lives in two places that are kept in sync
by the `handle_new_user()` trigger (`supabase/schema.sql`):

- **`profiles.role`** (database) — read by the server guard `requireRole`.
- **`app_metadata.role`** (JWT) — read by middleware and the client hook.

The role is always resolved from `app_metadata` (via `roleFromUser` in
`lib/rbac.ts`), never from `user_metadata`, because `user_metadata` is
client-controllable and would allow a self-signed privilege escalation.
`app_metadata` is only writable via the service role / admin API.

**Enforcement points**

| Layer | Guard | File |
|---|---|---|
| Middleware (edge) | Route-level access map | `lib/supabase/middleware.ts` + `lib/rbac.ts` |
| Server Component | `requireRole("teacher")` → redirects | `lib/requireRole.ts` |
| Client | `useRole().has("admin")` → conditional UI | `hooks/useRole.ts` |

**Route access map** — `lib/rbac.ts` exports `ROUTE_ROLES`, an array of
`{ prefix, roles }` pairs. More-specific (longer) prefixes win. Currently the map is empty:

```ts
// ROUTE_ROLES = [] — no staff-only routes; all dashboard pages are open to authenticated users.
```

`getRequiredRoles(path)` returns the required roles for a path or `null` if the
path is open. `hasRole(role, required)` compares ranks via `ROLE_RANK`.

**Server guard** — `lib/requireRole.ts` reads the role from the `profiles`
table (database source of truth), falling back to the JWT-backed `app_metadata`
role if the profile is missing. It redirects unauthenticated users to `/login`
and under-privileged users to `/dashboard`:

```ts
const role = await requireRole("teacher");
```

**Client hook** — `hooks/useRole.ts` derives the role from the current auth
session (`useAuth`), defaulting to `"student"`, and exposes
`has(required)` / `isAtLeast(required)`.

### Password policy

Password rules live in `utils/validation.ts` (`PASSWORD_RULES`) and are
enforced by the Zod schema `passwordSchema` in `lib/validations/auth.ts`:
at least 8 characters, one uppercase, one lowercase, one number. The change
password form also requires the confirmation to match
(`changePasswordSchema`).

### Auth forms & schemas

| Form | Schema | File |
|---|---|---|
| Login | `loginSchema` | `lib/validations/auth.ts` |
| Forgot password | `forgotPasswordSchema` | `lib/validations/auth.ts` |
| Change password | `changePasswordSchema` | `lib/validations/auth.ts` |

All forms use React Hook Form with the `zodResolver` and the reusable UI
primitives in `components/ui/form.tsx`.

---

## 4. Data Model

The database is PostgreSQL on Supabase. Every user-owned table enables Row
Level Security (RLS) with owner-only policies, so a user can only read/write
their own rows.

Schema source of truth:

- `supabase/schema.sql` — consolidated schema for fresh setups (run in the
  Supabase SQL Editor).
- `supabase/migrations/` — timestamped, incremental migrations applied with the
  Supabase CLI (`npm run db:migrate`).

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
| `must_change_password` | `boolean` | default `true`; forces first-login password change |
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
| `manual_grade` | `numeric` | grade points on the configured scale, manual courses only |
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

#### `academic_settings`

Per-user GPA configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` UNIQUE | references `profiles(id)` on delete cascade |
| `grade_scale` | `jsonb` | default `{"A":4,"A-":3.7,...}` (letter → points) |
| `target_gpa` | `numeric` | default `3.0`, CHECK `between 0 and 4.333` |
| `updated_at` | `timestamptz` | |

### Row Level Security

All six user-owned tables (`google_accounts`, `courses`, `assignments`,
`announcements`, `calendar_events`, `academic_settings`) enable RLS and have
four owner-only policies each (select/insert/update/delete), all keyed on
`auth.uid() = user_id`. `profiles` has select/update owner policies keyed on
`auth.uid() = id`.

```
create policy "courses owner select" on public.courses for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses for update using (auth.uid() = user_id);
create policy "courses owner delete" on public.courses for delete using (auth.uid() = user_id);
```

### Functions & triggers

| Function | Trigger | Fires on | Purpose |
|---|---|---|---|
| `handle_new_user()` | `on_auth_user_created` | after insert on `auth.users` | Creates the profile row; reads role from `app_metadata` (default `student`), mirrors the role back into `app_metadata` so it appears in the JWT |
| `handle_updated_at()` | `on_<table>_updated` (profiles + all google/academic tables) | before update | Sets `updated_at = now()` |

Note on `handle_new_user`: the role is read from `raw_app_meta_data`
(admin/service-role only) — never `user_metadata`, which is client-controllable
and would allow a self-signed privilege escalation.

### Migration history

| Migration | Contents |
|---|---|
| `20260811000001_init_profiles.sql` | `profiles` table, RLS, `handle_new_user`/`handle_updated_at` triggers |
| `20260811000002_add_role_enum.sql` | `user_role` enum, re-points `profiles.role`, role-aware trigger, `profiles_role_idx` |
| `20260813000001_google_academics.sql` | `google_accounts`, `courses`, `assignments`, `announcements`, `calendar_events`, `academic_settings`; owner RLS policies, indexes, `updated_at` triggers |

`schema.sql` is the consolidation of all three migrations for fresh setups.

---

## 5. Google Integration

The Academic Dashboard integrates with **Google Classroom** and **Google
Calendar** through a server-side OAuth 2.0 **authorization-code + PKCE** flow
with read-only scopes. Google data is pulled on demand into a local Supabase
cache; the dashboard itself never calls Google per page load.

### Architecture

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

**Error mapping** — `mapSyncError` (`services/google.service.ts`) maps HTTP
statuses to friendly messages: `429` → rate-limited, `403` → account lacks
access, `401` → session expired (also marks `needs_reconnect`).
`GoogleHttpError` (`lib/google/tokens.ts`) carries the status so callers can
branch. On failure the existing cache is kept so the dashboard still renders.

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

### Dashboard reads (no Google)

`services/academics.service.ts` builds all dashboard views purely from the
Supabase cache tables. `GET /dashboard` never calls Google. A cache is
considered **stale** after 12 hours (`STALENESS_MS`), which triggers the
"Sync now" nudge on the dashboard (`SyncNowCard`).

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

### Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/callback` | GET | none | Exchange Supabase auth code for session |
| `/api/google/auth` | GET | session | Start Google OAuth consent flow |
| `/api/google/callback` | GET | session | Finalize Google link + initial sync |
| `/api/dashboard/sync` | POST | session | Pull Google data into the Supabase cache |

---

## 7. Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers — GPA math, RBAC, Zod schemas, Supabase
error mapping, and utility functions.

### Running tests

```bash
npm test          # run once (vitest run)
npm run test:watch  # watch mode
```

### Configuration

| File | Purpose |
|---|---|
| `vitest.config.mts` | Test config: `jsdom` environment, `@` → repo root alias, globals, setup file, includes `**/*.test.{ts,tsx}` |
| `vitest.setup.ts` | Imports `@testing-library/jest-dom/vitest` (custom matchers) |

### Test files

| File | Area under test |
|---|---|
| `lib/gpa.test.ts` | Grade-scale conversion, weighted GPA, needed-average projection, assignment projection |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Academic settings and manual course Zod schemas |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `utils/cn.test.ts` | `cn()` class-name merging |
| `utils/safeRedirect.test.ts` | Open-redirect prevention in redirect targets |
| `utils/validation.test.ts` | Email validation, password strength rules, initials helper |

### What the tests verify

- **GPA math** — `lib/gpa.ts` is intentionally written as deterministic,
  side-effect-free functions so the entire model (quality-points / attempted
  credits weighted average, classroom percentage → scale conversion, goal
  projections) can be verified without Supabase or the network.
- **RBAC** — the role-ranking rules, role resolution defaults, and the
  longest-prefix route access lookup.
- **Zod schemas** — form validation boundaries (email format, password policy,
  GPA target range 0–4.33, credit-hour ranges, required fields).
- **Error mapping** — Supabase auth errors map to friendly messages, with a
  generic fallback.
- **Utilities** — class merging and open-redirect protection.

### Coverage notes

Tests currently target the pure/validation layers only. The service layer
(`services/*`), route handlers, and React components are not unit-tested yet;
the pure functions they depend on are.

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

Generate the token encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app runs without the Google variables unless the Academic Dashboard Google
integration is used; the OAuth config helper (`lib/google/tokens.ts`) fails
fast with a descriptive message when they're missing.

### Supabase setup

1. Create a Supabase project at <https://supabase.com/>.
2. Set the two `NEXT_PUBLIC_SUPABASE_*` variables.
3. Apply the schema one of two ways:
   - **Fresh setup:** run `supabase/schema.sql` in the Supabase SQL Editor.
   - **Incremental / CLI:** `npm run db:migrate` (requires the Supabase CLI,
     linked to the project). Migrations live in `supabase/migrations/`.
4. `npm run typegen` regenerates `types/database.types.ts` from the project
   (requires the CLI).

**Creating a test user with the first-login flow** — In Supabase →
Authentication → Users → "Add user", create a user with email/password and set
`must_change_password: true` in the user's metadata (JSON) to exercise the
forced password-change flow.

### Google Cloud setup (once per environment)

The Academic Dashboard uses a server-side OAuth 2.0 flow with read-only scopes.
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

The build runs ESLint and TypeScript type checking. `next.config.mjs` enables
`reactStrictMode` and allows images from the Supabase storage hostname
(`cbdxebzizvgzoupdplvs.supabase.co`); update the remote pattern if you use a
different Supabase project host.

### Notes & caveats

- **Secrets:** `NEXT_PUBLIC_*` vars are public (embedded in the client bundle);
  keep the anon key, not the service role key. `GOOGLE_*` vars are server-only.
- **Google quota:** sync is on-demand and respects Google's rate limits; a
  `429` surfaces as a friendly message.
- **Token rotation:** rotating `GOOGLE_TOKEN_ENCRYPTION_KEY` invalidates all
  stored Google tokens — users must reconnect.
- **Database migrations** should be applied before/after deploy as needed;
  `npm run db:migrate` is not part of the build.