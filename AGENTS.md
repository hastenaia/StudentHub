# AGENTS.md

Next.js 16 App Router + React 18 + TypeScript + Supabase (Auth, Postgres RLS, Storage). No monorepo.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000; unauthenticated → /login
npm run build        # production build; doubles as typecheck (no `typecheck` script; `tsc --noEmit` works too)
npm run lint         # eslint flat config (`eslint-config-next`)
npm test             # vitest run, all **/*.test.{ts,tsx}
npm run test:watch   # watch mode
npx vitest run lib/scheduling.test.ts   # single file
npx vitest run -t "nextRecurrence"      # single test by name
npm run typegen      # regenerate `types/database.types.ts` from Supabase project (needs CLI)
npm run db:migrate   # `supabase db push` (applies `supabase/migrations/`)
```

Setup: copy `.env.local.example` → `.env.local`; never commit keys. Migrations run in timestamp order via CLI or Supabase SQL Editor.

## Architecture

- Request gate is `proxy.ts` (Next 16 name), not `middleware.ts`. Delegates to `updateSession` (`lib/supabase/middleware.ts`), which applies pure rules in `lib/authGate.ts` (`rescueAuthLink` before session read, then `sessionRedirect`). Roles from `app_metadata` only — never `user_metadata`. New public pages must be added to `PUBLIC_ROUTES` in `lib/authGate.ts`.
- Page pattern: async Server Component `app/(dashboard)/dashboard/<feature>/page.tsx` calls `get<Domain>Data(user.id)` from `services/<domain>.service.ts` (server reads only), passes `initialData` to client `components/<domain>/<Domain>View.tsx`, which writes via `services/<domain>Client.service.ts` object (e.g. `tasksClientService`) returning `ApiResult<T>` (`ok()`/`fail()` in `types/api.ts`). Components never call Supabase directly; after mutation update optimistically and/or `router.refresh()`. Exception: `StudyHubView` owns the notes/flashcards/quizzes lists and passes them to the tabs as controlled props — `router.refresh()` cannot propagate a cross-tab save there, because a mounted component keeps its state and ignores fresh props.
- Supabase clients: `lib/supabase/server.ts` (server/route handlers), `lib/supabase/client.ts` (browser), shared cookie wiring in `lib/supabase/factory.ts`. DB types are generated `types/database.types.ts`.
- Pure logic lives in `lib/`: row→view mappers (`taskView.ts`, `courseView.ts`, `scheduleView.ts`), algorithms (`scheduling.ts` scored ordering + heap Top-K + recurrence, `progress.ts` 0–100 course score, `dates.ts`), `withActiveCourses` in `lib/supabase/queries.ts`. Zod schemas in `lib/validations/`, domain types in `types/<domain>.ts`.
- Google: pages read Supabase cache only, never Google. Sole Google caller is `POST /api/dashboard/sync` (`services/google.service.ts` → `classroom/calendar.service.ts`). OAuth is `app/api/google/auth` → `app/api/google/callback`; tokens AES-256-GCM encrypted (`lib/google/crypto.ts`, key `GOOGLE_TOKEN_ENCRYPTION_KEY`). Supabase auth callbacks (`app/auth/callback`, `app/auth/confirm`) are separate.
- AI: `app/api/ai/*` handlers use `lib/ai/route.ts` (`startAIRoute`, `resolveNoteSource`, `runAI`) + `callAI()` in `lib/ai/provider.ts` (raw `fetch`, first configured provider `OPENAI_API_KEY`/`AI_API_KEY` → `ANTHROPIC_API_KEY` → `GOOGLE_AI_API_KEY`/`GEMINI_API_KEY`, ~15s timeout). Unconfigured → 503 error, never fake output. Five prompt routes cache answers in `ai_cache` (`lib/ai/cache.ts`, `lib/ai/cacheKey.ts`) and return `cached`; `refresh: true` in the body forces a re-ask. `wellness-tip` is uncached.
- Study AI history: `components/study/AIAssistantTab.tsx` renders the cache/history list; `services/aiCache.service.ts` (server read) + `services/aiCacheClient.service.ts` (list/delete), row→view in `lib/aiCacheView.ts`.
- Leftovers: `academic_settings`, `courses.manual_grade`/`target_pct` are unused schema.

## Database

- `supabase/migrations/` (timestamped) is source of truth. `supabase/schema.sql` and `consolidated.sql` are stale snapshots. Every table is owner-only RLS on `user_id`. After adding a migration, run `npm run typegen`.

## Testing

- Vitest + Testing Library, jsdom default, globals on, `@` → repo root (`vitest.config.mts`). Files needing Node crypto/`Response` add `// @vitest-environment node`.
- Coverage is pure layers only (`lib/**`, `utils/*`, `callAI`, auth redirects, 2 hooks, a few components). `services/*`, most route handlers/components are untested — move logic into pure `lib/*.ts` and test there.

## Workflow

- `docs/` (architecture, auth, data-model, api, google-integration, testing, deployment) are the reference; `PROJECT_DOCUMENTATION.md` is a merged copy — edit the sources, not it. Update the matching doc when changing routes, tables, or auth flow.
- Path alias is `@/*` → repo root (not `src/`). Tailwind brand tokens live in `tailwind.config.ts` (`bg-brand-royal`, etc.).
- Dark mode is class-based on `<html>` and **token-driven, not `dark:`-variants**: `gray-*`, `brand.gray` and `brand.dark` resolve to CSS vars from `app/globals.css`, so they flip automatically — never hand-add `dark:` to them. Pastel palette shades used in markup (`emerald/sky/amber/purple/red/green/orange/yellow` in `tailwind.config.ts`) follow the same rule via `--c-<hue>-<shade>` vars (`:root` = light palette value, `.dark` = theme tint/lift); a new pastel shade needs the config entry plus both var definitions. `lib/theme.ts` owns resolution, `hooks/useTheme.ts` owns state, the toggle lives in `Navbar` beside the bell, and `profiles.theme` persists it.
- Before `git commit`/`push`: `fallow audit --format json --quiet --explain --gate-marker agent`; fix `fail` verdicts first.
