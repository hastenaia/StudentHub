# StudentHub

Your all-in-one student management platform: courses, schedules, grades, and
academic life organized and always in sync.

StudentHub aggregates a student's Google Classroom and Google Calendar into a
single, private academic dashboard with a live GPA projection. It is built on
Next.js (App Router) with a Supabase backend (Auth, PostgreSQL, Row Level
Security).

> Phase 1.5 — Foundation, Authentication, and the Academic Dashboard
> (Google Classroom + Calendar integration with GPA math).

## Features

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

## Tech stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 16 (App Router), React 18                      |
| Language   | TypeScript                                             |
| Styling    | Tailwind CSS, class-variance-authority, tailwind-merge |
| Animations | Framer Motion                                          |
| Icons      | lucide-react                                           |
| Forms      | react-hook-form + zod (`@hookform/resolvers`)          |
| Backend    | Supabase (Auth, PostgreSQL, RLS, Storage)              |
| Testing    | Vitest + Testing Library (jsdom)                       |
| Linting    | ESLint (`eslint-config-next`, flat config)             |

Exact dependency versions are pinned in `package.json` / `package-lock.json`.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase project
values. Never commit real keys.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Google OAuth variables are only required when using the Academic Dashboard
integration (see [Google integration setup](#google-integration-setup)).

### 3. Set up the database

Run `supabase/schema.sql` in the Supabase SQL Editor (or apply the timestamped
migrations with the Supabase CLI, see [docs/deployment.md](docs/deployment.md)).
This creates the `profiles` table with Row Level Security, a trigger that
auto-creates a profile on signup, and the `must_change_password` flag.

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` — unauthenticated visitors are redirected to
`/login`.

## Google integration setup

The Academic Dashboard (Google Calendar + Google Classroom) uses a server-side
OAuth 2.0 authorization-code + PKCE flow with read-only scopes. Full setup
instructions are in [docs/google-integration.md](docs/google-integration.md)
and [docs/deployment.md](docs/deployment.md). The required environment
variables are:

```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=<random-64-char-hex>
```

Apply the Google data tables once per environment:

```bash
npm run db:migrate   # pushes supabase/migrations/, incl. google_academics
```

### How the module works

- **Dashboard** (`app/(dashboard)/dashboard/page.tsx`) is a Server Component
  that reads a Supabase cache — it never calls Google per page load.
- **Sync** (`POST /api/dashboard/sync`) is the only path that talks to Google:
  on demand, it fetches Classroom courses/assignments/announcements and a
  rolling Calendar window, then upserts them into
  `google_accounts`, `courses`, `assignments`, `announcements`,
  `calendar_events` (all owner-only RLS).
- **Focus Timer + Study Stats** (`dashboard/focus`, Module 3): pomodoro
  sessions are logged to `study_sessions`; pure math in `lib/focus.ts`
  (unit-tested with Vitest) computes daily/weekly minutes, streaks and
  per-course breakdowns.
- **Deadline Radar** (`dashboard/schedule`): a 28-day heatmap of unsubmitted
  work with crunch-week warnings — logic in `lib/deadlineRadar.ts`.
- **Smart Daily Plan** (dashboard home card): merges open tasks, near-deadline
  assignments and calendar free time into one prioritized list — logic in
  `lib/dailyPlan.ts`.
- **Settings** (`dashboard/settings`) manages the Google connection and
  account security.

## Architecture

```
app/
  (auth)/            Login, forgot password, change password — public routes
  (dashboard)/        Authenticated app shell + pages
  auth/callback/       Route handler that exchanges a Supabase auth code for a session
  layout.tsx           Root layout: fonts, ToastProvider, Toaster
  error.tsx             Root error boundary
  not-found.tsx         404 page
components/
  ui/                  Reusable primitives (Button, Input, Card, Skeleton, Toaster, Form...)
  layout/              Sidebar, Navbar, DashboardShell
  auth/                LoginForm, ForgotPasswordForm, ChangePasswordForm
  common/              ErrorBoundary, Skeletons, ComingSoon
hooks/                 useAuth, useToast, useMediaQuery, useRole
lib/
  supabase/            Browser client, server client, middleware session helper, error mapping
  rbac.ts              Role hierarchy + route-level access map
  requireRole.ts       Server-side role guard (redirects)
  validations/         Zod schemas (auth)
services/               auth.service.ts — all Supabase Auth calls live here
types/                  Database + auth + api result types
utils/                  cn(), validation helpers (+ unit tests)
proxy.ts                Route protection + first-login password-change + RBAC redirects
supabase/
  schema.sql            Consolidated schema for fresh setups
  migrations/           Timestamped migration files (offline-managed)
eslint.config.mjs       ESLint flat config
vitest.config.mts       Vitest config
```

## Horizontal infrastructure (Phase 1.5)

- **Roles & RBAC** — `public.user_role` enum (`student`/`teacher`/`admin`) with a
  route-level access map in `lib/rbac.ts`, a server guard (`lib/requireRole.ts`),
  and a client hook (`hooks/useRole`). Role is enforced in middleware.
- **Forms** — React Hook Form + Zod with reusable UI primitives in
  `components/ui/form.tsx` and schemas in `lib/validations/`.
- **Testing** — Vitest + Testing Library (`npm test`). Covers validation utils,
  Zod schemas, RBAC, and Supabase error mapping.
- **Error handling** — consistent `ApiResult` (`types/api.ts`) returned by
  services and friendly messages via `lib/supabase/errors.ts`.

## Scripts

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

## Deploying

Push to GitHub and import the repository in Vercel. Add the Supabase (and
Google, if used) environment variables in the Vercel project settings. See
[docs/deployment.md](docs/deployment.md).

## Documentation

- [Architecture](docs/architecture.md) — directory map, data flow, modules, design tokens
- [Authentication & RBAC](docs/auth.md) — session handling, route protection, forced password change, roles
- [Data model](docs/data-model.md) — tables, columns, RLS, triggers, enums, migrations
- [Google integration](docs/google-integration.md) — OAuth flow, token encryption, sync pipeline
- [API routes](docs/api.md) — route handlers, request/response contracts
- [Testing](docs/testing.md) — Vitest setup and coverage
- [Deployment](docs/deployment.md) — environment variables, Supabase, Vercel, Google Cloud

## Design system

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
