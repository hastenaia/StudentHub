# StudentHub

Your all-in-one student management platform: courses, schedules, tasks,
study tools, and wellness, organized and always in sync.

StudentHub combines a student's own planning data (tasks, schedule, notes,
flashcards, focus sessions, mood check-ins) with a read-only cache of their
Google Classroom and Google Calendar, in a single private dashboard. It is
built on Next.js (App Router) with a Supabase backend (Auth, PostgreSQL, Row
Level Security, Storage).

## Features

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

## Tech stack

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

Optional groups:

- **Google Classroom/Calendar**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY` (see
  [Google integration setup](#google-integration-setup)).
- **AI features**: one of `OPENAI_API_KEY` (or `AI_API_KEY`),
  `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY` (or `GEMINI_API_KEY`). Without
  one, the AI tab shows a configuration error instead of fake responses.

### 3. Set up the database

Apply the migrations in `supabase/migrations/`, either with the Supabase CLI
(`npm run db:migrate`) or by running each file in timestamp order in the
Supabase SQL Editor. `supabase/schema.sql` and `supabase/consolidated.sql` are
older partial snapshots; see [docs/data-model.md](docs/data-model.md).

Then, in Supabase → Authentication → URL Configuration, set the Site URL to
`http://localhost:3000` and add `http://localhost:3000/**` to Redirect URLs so
password-reset and confirmation links return to the app.

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Unauthenticated visitors are redirected to
`/login`.

## Google integration setup

The Classroom/Calendar integration uses a server-side OAuth 2.0
authorization-code + PKCE flow with read-only scopes. Full setup
instructions are in [docs/google-integration.md](docs/google-integration.md)
and [docs/deployment.md](docs/deployment.md). The required environment
variables are:

```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=<random-64-char-hex>
```

"Continue with Google" sign-in is separate: it is Supabase's Google auth
provider, enabled in the Supabase dashboard.

### How the module works

- **Pages** are Server Components that read the Supabase cache. They never
  call Google on page load.
- **Sync** (`POST /api/dashboard/sync`) is the only path that talks to Google:
  on demand, it fetches Classroom courses/assignments/announcements and a
  rolling Calendar window, then upserts them into `courses`, `assignments`,
  `announcements` and `calendar_events` (all owner-only RLS).
- **Tokens** are encrypted with AES-256-GCM before being stored in
  `google_accounts`.

## Architecture

Each feature follows the same pattern: an async Server Component page reads
data through `services/<domain>.service.ts` and passes it to a client
`components/<domain>/<Domain>View.tsx`, which writes back through
`services/<domain>Client.service.ts` (returning `ApiResult` from
`types/api.ts`). Request protection lives in `proxy.ts` →
`lib/supabase/middleware.ts`. See [docs/architecture.md](docs/architecture.md)
for the directory map, module table and request lifecycle.

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
Google / AI, if used) environment variables in the Vercel project settings.
See [docs/deployment.md](docs/deployment.md).

## Documentation

- [Architecture](docs/architecture.md): directory map, modules, data flow, design tokens
- [Authentication & RBAC](docs/auth.md): sessions, proxy protection, sign-up, Google sign-in, password flows, roles
- [Data model](docs/data-model.md): tables, columns, RLS, storage, triggers, migrations
- [Google integration](docs/google-integration.md): OAuth flow, token encryption, sync pipeline
- [API routes](docs/api.md): auth callbacks, Google, sync, and AI route handlers
- [Testing](docs/testing.md): Vitest setup and coverage
- [Deployment](docs/deployment.md): environment variables, Supabase, Vercel, Google Cloud

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
