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
  common/                ErrorBoundary, Skeletons, PageHeader
  auth/AuthFields.tsx    Shared auth form pieces (IconField, PasswordRules, NewPasswordFields)
hooks/                   useAuth, useToast (incl. notify), useGroupedEvents, useEscapeKey
lib/
  supabase/              Browser/server clients, shared cookie factory, session
                         middleware, error mapping, auth-link redirects,
                         shared queries (activeCoursesQuery, withActiveCourses)
  rbac.ts                Role hierarchy + route-level access map
  ai/provider.ts         Server-only multi-provider AI call with timeout
  ai/route.ts            Shared /api/ai/* plumbing: auth + body, note source, error mapping
  google/                OAuth token mechanics + AES-256-GCM token encryption
  scheduling.ts          Scored task ordering, heap Top-K + recurrence math (unit-tested)
  focus.ts               Focus/Pomodoro helpers
  dates.ts               startOfDay/endOfDay, reporting windows, streaks (unit-tested)
  wellness.ts, taskSort.ts, aiRequests.ts   Pure page logic pulled out of services/components (unit-tested)
  taskView.ts, courseView.ts, scheduleView.ts   DB row → view-model mappers
  eventTypeInference.ts  Schedule event-type keyword inference (unit-tested)
  validations/           Zod schemas per domain
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
| `/dashboard/courses` | `courses.service.ts` (+ 0–100 progress via `lib/progress.ts`) | courses, assignments |
| `/dashboard/schedule` | `schedule.service.ts` | schedule_events (editable) + calendar_events (Google, read-only) + tasks (due dates, derived read-only) |
| `/dashboard/tasks` | `tasks.service.ts` (runs the task scheduler) | tasks, courses |
| `/dashboard/study` | `notes.service.ts`, `flashcards.service.ts`, `quizzes.service.ts` | notes, note_attachments, flashcards, quizzes, quiz_questions, quiz_attempts |
| `/dashboard/focus` | `focus.service.ts` | focus_sessions |
| `/dashboard/analytics` | `analytics.service.ts` | tasks, focus_sessions, notes, flashcards, quiz_attempts, schedule_events, wellness_entries |
| `/dashboard/wellness` | `wellness.service.ts` | wellness_entries |
| `/dashboard/achievements` | `gamification.service.ts` | profiles, badges, user_badges |
| `/dashboard/settings` | `academics.service.ts` → `getGoogleAccountView`, `gamification.service.ts` | profiles, google_accounts, courses, badges, user_badges |

Known leftovers: `academic_settings` and `courses.manual_grade` / `courses.target_pct`
are unused schema.

### Schedule event types

`schedule_events.event_type` is one of `class`, `assignment`, `exam`,
`study_session`, `personal`, `other`. Colours live in `types/schedule.ts`
(`EVENT_TYPE_COLOR` plus `EVENT_TYPE_ON_COLOR` for legible text on the chip);
`eventTypeStyle` in `lib/scheduleView.ts` is the single source of truth for chip
styling — an explicit per-event `color` wins, otherwise the type palette applies,
and Google events are dimmed to read as read-only. A custom colour has no curated
pairing, so `readableTextColor` picks `CHIP_TEXT_DARK` or `CHIP_TEXT_LIGHT` by WCAG
relative luminance instead of assuming white; `lib/views.test.ts` asserts the
luminance choice agrees with every hand-tuned `EVENT_TYPE_ON_COLOR` pairing.

New events get an advisory suggestion only: `lib/eventTypeInference.ts` matches
title/description keywords in precedence order (exam → assignment → class →
personal → study_session → other) and `EventForm` offers to apply it, so the type
stored in the database is always the user's choice. Google events have no
`event_type` column (`calendar_events` is replaced on every sync), so their type
is inferred at read time in `calendarRowToView`. User rows do **not** fall back to
inference: `event_type` is `NOT NULL` and check-constrained, so an unrecognised
value is corrupt data and maps to `other`.

### Schedule views

`ScheduleView` is a thin orchestrator — it holds view/date state and wires the
pieces together; `MonthView`, `WeekView`, `DayView` and `AgendaView` are pure
renderers over the same `ScheduleEvent[]`. `ScheduleEvent.source` is
`"user" | "google" | "task"`, and every branch on it is explicit: only `user` is
writable. State lives in two hooks (`useScheduleEvents` for the list plus its three
mutations, `useScheduleDialogs` for which dialog is open) so the container itself
stays within the project's complexity budget; `ScheduleToolbar`,
`ScheduleCalendarView`, `ScheduleDialogs` and `ScheduleFooter` render the chrome.
Period arithmetic (`viewRange`, `stepPeriod`, `viewHeaderLabel`) is pure and lives in
`lib/scheduleView.ts`, and `useFilteredEvents` clips the list to the visible period
while keeping events that merely overlap it.

Three shared pieces keep the four views consistent:

- `components/schedule/EventChip.tsx` — the one chip used by month, week and day
  (`layout="row"` for the day view's title-left/time-right treatment), so colour,
  typography and the Google read-only marker can't drift between views.
- `components/schedule/EventEmptyState.tsx` — one empty state for all four views,
  with per-view copy.
- `hooks/useGroupedEvents.ts` — three groupings, one per convention: `byDay` and
  `byDayHour` bucket by **start** day (agenda lists a multi-day event once, on the
  day it starts), while `byDaySpan` repeats an event across every day it touches
  (grids render it on each day). `byDaySpan` takes an optional `range` so a
  view clamps expansion to the days it renders; the end is exclusive, so an event
  ending exactly at 00:00 — a Google all-day event — doesn't also claim the next
  day.
- `components/schedule/EventDetailDialog.tsx` — one detail dialog for all three
  sources; the footer offers Edit/Delete only for `user` events and otherwise
  explains why the entry is read-only. A task deadline is flagged all-day but
  shows its due time, since the user set a clock time on the task.

All-day events get their own lane in both week and day, and are filtered out of the
hour grid. Week and day step days with `setDate` rather than `+24h` arithmetic, so
a DST change inside the displayed period can't skip or repeat a day.

`default_calendar_view` is read server-side in `getScheduleData` and passed as
`initialView`, so the saved view is correct on the first paint; reading
`localStorage` in the client component would mismatch the SSR HTML.

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

   One page departs from this: `/dashboard/study` keeps its notes, flashcards
   and quizzes in `StudyHubView`, which passes the lists and their setters down
   to the tabs as controlled props and reports AI-tab saves upward via
   `onNoteCreated` / `onCardsCreated` / `onQuizCreated`. That is deliberate —
   `router.refresh()` cannot help here, because React preserves a mounted
   component's state and ignores the fresh props, so a save in the AI tab would
   stay invisible to the other tabs until a full page reload.

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
(`nextRecurrence`), and a "Suggested Order" computed in `lib/scheduling.ts`:
`buildSchedule` precomputes an urgency key per task and sorts once (O(N log N));
`buildTopSchedule` keeps a bounded binary heap for the dashboard top-5 (O(N log K)).

### Study Hub
Notes (Markdown preview, tags, categories via `lib/noteCategories.ts`, favorites,
PDF attachments stored in the private `notes-pdfs` Storage bucket), flashcards, quizzes with attempts, and an
AI assistant tab. AI results can be saved as flashcards/quizzes.

### AI
`/api/ai/*` handlers use `lib/ai/route.ts` (`startAIRoute` for auth + body,
`resolveNoteSource` to load a note by `noteId`, `runAI` to call `callAI()` in
`lib/ai/provider.ts` and map failures to 503/502). See
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
| `brand-gray` (surface) | `hsl(var(--surface-muted))` |
| `brand-dark` (text) | `hsl(var(--fg))` |

Additional Tailwind color roles (primary/secondary/muted/accent/card) map onto
these brand values; `border`/`input`/`ring`/`background`/`foreground` use CSS
variables from `app/globals.css`. The Inter font is loaded via
`next/font/google` and exposed as `--font-inter`. Classes are merged with
`cn()` from `utils/cn.ts`.

## Dark mode

`darkMode: ["class"]` plus a `.dark` class on `<html>` drives theming. The
`light`/`dark`/`system` value is stored in `profiles.theme` and mirrored to
`localStorage["studenthub:theme"]`.

Most color utilities are **variable-driven rather than `dark:`-variants**.
`gray-100…700`, `brand.gray` and `brand.dark` resolve to CSS variables declared
in `app/globals.css`, and the `.dark` block redeclares those variables. This is
why existing utilities such as `text-gray-500` or `bg-brand-gray` flip with the
theme without per-component edits — do not hand-add `dark:` variants to them.

Two exceptions stay fixed hex values on purpose, because they are always
label-on-blue pairs: `text-white` and `bg-brand-royal` (`brand.sky` likewise).
Their surface/text counterparts are bridged by two high-specificity shims in
`globals.css`: `.dark .bg-white` and `.dark .text-brand-royal`.

Resolution and flow:

- `lib/theme.ts` is the single source of truth: `Theme`, `resolveTheme`,
  `nextTheme`, `isTheme`, `readStoredTheme`, `applyThemeToRoot`, and
  `THEME_BOOTSTRAP_SCRIPT`. It is pure and unit tested.
- `app/layout.tsx` inlines `THEME_BOOTSTRAP_SCRIPT` into `<head>` so the class is
  set before first paint (no light flash) and pairs it with
  `suppressHydrationWarning`. `app/error.tsx` renders its own `<html>`, so it
  repeats both.
- `hooks/useTheme.ts` exposes `{ theme, resolved, mounted, setTheme, toggle }`.
  It reads the OS preference and hydration state through `useSyncExternalStore`
  (no `setState` in effects), so `system` stays live and the icon cannot
  mismatch on hydration. Changes are broadcast to other mounted hooks in the tab
  and to other tabs via the `storage` event, then persisted by
  `services/preferencesClient.service.ts`.
- `app/(dashboard)/layout.tsx` reads `profiles.theme` server-side and passes
  `initialTheme` down, so the choice follows the user to a new device. A
  locally stored value wins over the server value, so an offline or failed save
  is not reverted by the next navigation.
- The navbar toggle sits beside the notification bell. Pressing it always writes
  an explicit `light`/`dark`, which leaves `system` behind by design.

