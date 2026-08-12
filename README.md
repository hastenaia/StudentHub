# StudentHub — Phase 1

Foundation, Authentication, and UI System for the StudentHub web app.

Built with Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Framer Motion,
Lucide Icons, and Supabase (Auth + PostgreSQL + Storage).

## 1. Setup

```bash
npm install
```

Environment variables are required (copy `.env.local.example` to `.env.local`
and fill in your Supabase project values — do not commit real keys):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Set up the database

Open the Supabase SQL Editor for this project and run `supabase/schema.sql`.
This creates:

- A `profiles` table (1:1 with `auth.users`) with Row Level Security
- A trigger that auto-creates a profile whenever a new user signs up
- A `must_change_password` flag used to force a password change on first login

## 3. Create a test user

In Supabase → Authentication → Users → "Add user", create a user with
an email/password and set `must_change_password: true` in the user's
metadata (JSON field) to test the first-login password-change flow.

## 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.

## 5. Deploy

Push to GitHub and import the repo in Vercel. Add the two environment
variables above in your Vercel project settings.

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
middleware.ts           Route protection + first-login password-change + RBAC redirects
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
npm run dev        # start dev server
npm run build      # production build
npm test           # run unit tests (vitest)
npm test:watch     # watch mode
npm run lint       # ESLint
npm run db:reset   # reset local supabase db (needs CLI)
npm run db:migrate # push migrations (needs CLI)
npm run typegen    # regenerate database.types.ts (needs CLI)
```

## Authentication features implemented

- Email/password login with Supabase Auth
- Session persistence via cookies (SSR-safe, refreshed in middleware)
- Protected routes — unauthenticated users are redirected to `/login`
- Forgot password → email reset link → `/change-password`
- Forced password change on first login (`must_change_password` flag)
- Logout

## Design system

| Token | Value |
|---|---|
| Royal Blue (primary) | `#0033A0` |
| Sky Blue (accent) | `#87CEEB` |
| White | `#FFFFFF` |
| Gray (surface) | `#F4F6F9` |
| Dark (text) | `#1A1A1A` |
| Font | Inter |

Fully responsive across desktop, tablet, and mobile, with a collapsible
mobile sidebar, skeleton loading states, and toast notifications.
