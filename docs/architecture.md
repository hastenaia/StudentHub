# Architecture

## Overview

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

## Directory map

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

## Request lifecycle

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

## Client vs. server

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

## Modules

### Authentication & RBAC
- Email/password sign in and password reset via Supabase Auth
  (`services/auth.service.ts`).
- Session persistence via SSR-safe cookies refreshed in middleware
  (`lib/supabase/middleware.ts`).
- First-login forced password change driven by the `must_change_password` flag.
- Role model: `public.user_role` enum (`student` / `teacher` / `admin`), a
  role-rank hierarchy in `lib/rbac.ts`, a route-level access map, a server
  guard (`lib/requireRole.ts`), and a client hook (`hooks/useRole.ts`).
- The role is always read from `app_metadata` (JWT-backed, admin-only
  writable) — never from client-controllable `user_metadata`.

### Academic dashboard
- Server-rendered from the Supabase cache (`services/academics.service.ts`).
- GPA projection math is pure functions in `lib/gpa.ts`, unit-tested with
  Vitest.
- The sync endpoint is the only Google caller; it upserts courses,
  assignments, announcements, and a rolling calendar window.

### Settings
- Google connection management (`components/settings/GoogleConnectionCard.tsx`).
- Academic settings: grading scale presets + target GPA
  (`components/settings/AcademicSettingsCard.tsx`).
- Manual course CRUD for courses not on Google Classroom
  (`components/settings/ManualCoursesCard.tsx`).

### Placeholders
No placeholders remain — all dashboard modules (`courses`, `schedule`, `tasks`, `notes`, `analytics`, `wellness`, `achievements`, `focus`) are implemented; the former `students` module has been removed.

## Data flow notes

- The dashboard never calls Google per page load — it reads only the Supabase
  cache tables.
- `POST /api/dashboard/sync` is the sole path that contacts Google for the
  signed-in user; it is idempotent and safe to re-run.
- Google OAuth tokens are encrypted at rest (AES-256-GCM) before being stored
  in `google_accounts` (`lib/google/crypto.ts`); the plaintext never touches
  Postgres or the browser.

## Design system

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
`fade-in`.
