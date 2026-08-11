# StudentHub — Phase 1

Foundation, Authentication, and UI System for the StudentHub web app.

Built with Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Framer Motion,
Lucide Icons, and Supabase (Auth + PostgreSQL + Storage).

## 1. Setup

```bash
npm install
```

Environment variables are already filled in for you in `.env.local`
(copied from `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://cbdxebzizvgzoupdplvs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kQqG2KIic6nXQUpbaLF5XQ_Si3Cwnip
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
  ui/                  Reusable primitives (Button, Input, Card, Skeleton, Toaster...)
  layout/              Sidebar, Navbar, DashboardShell
  auth/                LoginForm, ForgotPasswordForm, ChangePasswordForm
  common/              ErrorBoundary, Skeletons, ComingSoon
hooks/                 useAuth, useToast, useMediaQuery
lib/supabase/          Browser client, server client, middleware session helper
services/               auth.service.ts — all Supabase Auth calls live here
types/                  Database + auth types
utils/                  cn(), validation helpers
middleware.ts           Route protection + first-login password-change redirect
supabase/schema.sql     Database schema, RLS policies, triggers
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
