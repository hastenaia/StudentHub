# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server on http://localhost:3000
npm run build        # production build (also the de-facto type check)
npm run lint         # ESLint flat config (eslint-config-next core-web-vitals + typescript)
npm test             # vitest run (all **/*.test.{ts,tsx})
npm run test:watch
npx vitest run lib/scheduling.test.ts      # single test file
npx vitest run -t "partial test name"      # single test by name
npm run typegen      # regenerate types/database.types.ts from Supabase project cbdxebzizvgzoupdplvs
npm run db:migrate   # supabase db push (applies supabase/migrations/)
```

Tests run in jsdom with globals and the `@` → repo-root alias (`vitest.config.mts`). They cover only pure/validation code (`lib/*.test.ts`, `lib/validations/*.test.ts`, `utils/*.test.ts`, plus the exported `renderMarkdown` in `components/study/MarkdownPreview.test.ts`); services, route handlers and components are not unit-tested.

## Architecture

**Request gate is `proxy.ts`, not `middleware.ts`** (Next 16 renamed it). It delegates to `updateSession` in `lib/supabase/middleware.ts`, which in order: rescues stray `?code=`/`?token_hash=` auth links by forwarding them to `/auth/callback`; refreshes the session via `auth.getUser()`; redirects unauthenticated users on non-`PUBLIC_ROUTES` to `/login?redirectTo=`; forces `/change-password` when `user_metadata.must_change_password` is true; enforces route RBAC from `lib/rbac.ts`. Roles (`student`/`teacher`/`admin`) are read from `app_metadata` only — never `user_metadata` (client-writable). New public pages must be added to `PUBLIC_ROUTES`.

**Supabase clients**: `lib/supabase/server.ts` (Server Components / route handlers, cookie-based) and `lib/supabase/client.ts` (browser). Both share cookie wiring in `lib/supabase/factory.ts`. DB types come from the generated `types/database.types.ts`.

**Server/client service split** — each feature domain has two service files:
- `services/<domain>.service.ts` — server-only reads. A page (`app/(dashboard)/dashboard/<feature>/page.tsx`, an async Server Component) gets the user, calls e.g. `getTasksData(user.id)`, and passes the assembled view model as `initialData` to a client `components/<feature>/<Feature>View.tsx`.
- `services/<domain>Client.service.ts` — `"use client"` writes, exported as an object (e.g. `tasksClientService`), returning `ApiResult<T>` built with `ok()`/`fail()` from `types/api.ts`. Components go through these, never call Supabase directly. After mutating, components update optimistically and/or `router.refresh()`.
- Row → view-model mapping lives in `lib/*View.ts` (`taskView.ts`, `courseView.ts`, `scheduleView.ts`); pure algorithms in `lib/scheduling.ts` (min-heap task ordering, recurrence) and `lib/dates.ts` (day bounds, reporting windows, streaks). Server services load a page's rows plus course options with `withActiveCourses` (`lib/supabase/queries.ts`). Zod schemas per domain in `lib/validations/`, domain types in `types/<domain>.ts`.

**Google integration**: dashboard pages only read Supabase cache tables. `POST /api/dashboard/sync` (via `services/google.service.ts` → `classroom.service.ts` / `calendar.service.ts`) is the *only* code path that calls Google APIs; it upserts courses/assignments/announcements/calendar_events. OAuth (authorization code + PKCE) is `app/api/google/auth` → `app/api/google/callback`; tokens are AES-256-GCM encrypted at rest (`lib/google/crypto.ts`, key `GOOGLE_TOKEN_ENCRYPTION_KEY`). Supabase auth callbacks (email links, Google sign-in) are the separate `app/auth/callback` and `app/auth/confirm` routes.

**AI (Study Hub / notes)**: `app/api/ai/*` route handlers use the helpers in `lib/ai/route.ts` (`startAIRoute`, `resolveNoteSource`, `runAI`) to authenticate the user, build a prompt, and call `callAI()` in `lib/ai/provider.ts` — a raw-`fetch` abstraction that picks the first configured provider (`OPENAI_API_KEY`/`AI_API_KEY` → `ANTHROPIC_API_KEY` → `GOOGLE_AI_API_KEY`/`GEMINI_API_KEY`) with a hard ~4.5s timeout. When unconfigured it returns an error (routes respond 503); it must never return fake output.

**Mocks**: `lib/mocks/` still backs some UI (the notes page and `CalendarViews`); most modules now read real Supabase data.

## Database

`supabase/migrations/` (timestamped) is the source of truth. `supabase/schema.sql` and `supabase/consolidated.sql` are older single-file snapshots for fresh setups and do not include later migrations. Every table is owner-only RLS keyed on `user_id`. After adding a migration, run `npm run typegen` to refresh `types/database.types.ts`.

## Docs

Reference docs live in `docs/` (architecture, auth, data-model, api, google-integration, testing, deployment). `PROJECT_DOCUMENTATION.md` is a merged copy of `README.md` + those docs — edit the sources, not it. When changing routes, tables or auth flow, update the matching doc. The GPA feature (`lib/gpa.ts`), `lib/requireRole.ts` and `hooks/useRole` were removed; `academic_settings`, `courses.manual_grade` and `courses.target_pct` remain in the schema unused.

<!-- fallow:agent-install v1 claude-import:start -->
@AGENTS.md
<!-- fallow:agent-install v1 claude-import:end -->
