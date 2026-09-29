# Architecture

## Overview

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

## Directory map

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

## Feature modules

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

## Request lifecycle

1. **Proxy** (`proxy.ts` → `updateSession` in `lib/supabase/middleware.ts`)
   runs on every non-static request. It first redirects any request carrying
   `?code=`, `?token_hash=` or `?error=` outside the auth routes to
   `/auth/callback` (Supabase falls back to the Site URL when the redirect
   allow-list isn't configured). It then creates a cookie-bound Supabase
   client, calls `auth.getUser()`, and applies the checks described in
   [auth.md](auth.md#proxy-protection).
2. **Server Component** loads the user with `lib/supabase/server.ts`, calls its
   domain's `get<Domain>Data(userId)` and passes the result as `initialData`
   to the client view.
3. **Client interactions** call `<domain>ClientService` methods (which return
   `ApiResult<T>` from `types/api.ts`), update local state optimistically, and
   call `router.refresh()` where server data must be re-read.

## Client vs. server

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

## Modules

### Authentication & RBAC
Email/password and Google sign-in via Supabase Auth, a forced first-login
password change, and a `student`/`teacher`/`admin` role model enforced in the
proxy. See [auth.md](auth.md).

### Google Classroom & Calendar
Read-only OAuth link, encrypted token storage, and an idempotent sync into
cache tables. See [google-integration.md](google-integration.md).

### Tasks
Kanban + list views with dnd-kit, priorities, tags, recurrence
(`nextRecurrence`), and a "Suggested Order" computed by the min-heap in
`lib/scheduling.ts` (`buildSchedule`; `buildTopSchedule` for the dashboard).

### Study Hub
Notes (Markdown preview, tags, favorites, PDF attachments stored in the
private `notes-pdfs` Storage bucket), flashcards, quizzes with attempts, and an
AI assistant tab. AI results can be saved as flashcards/quizzes.

### AI
`/api/ai/*` handlers authenticate the user, optionally load a note by
`noteId`, build a prompt and call `callAI()` in `lib/ai/provider.ts`. See
[api.md](api.md#ai-routes).

### Focus, Wellness, Analytics, Achievements
Pomodoro timer with ambient sounds (`ChillHub`, procedurally generated), daily
mood check-ins with journal, cross-module analytics, and badges/XP/streaks
computed from real activity.

### Settings
Profile, preferences (timezone, theme, default calendar/task views,
notifications, stored on `profiles`), the Google connection, and manually
tracked courses.

## Data flow notes

- Pages never call Google. They read cache tables only.
- `POST /api/dashboard/sync` is the only path that contacts Google for the
  signed-in user. It is idempotent and safe to re-run.
- Google OAuth tokens are encrypted at rest (AES-256-GCM) before being stored
  in `google_accounts` (`lib/google/crypto.ts`). The plaintext never touches
  Postgres or the browser.
- AI keys are server-only. When no provider is configured, the AI routes
  return a 503 with a configuration message, never fake output.

## Design system

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
