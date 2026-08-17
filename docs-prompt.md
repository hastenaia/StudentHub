# Refined Prompt: Generate StudentHub Project Documentation

You are a senior technical writer and software engineer. Using the StudentHub codebase at the repository root, produce a comprehensive, accurate, and well-organized set of project documentation. Ground every statement in the actual code — do not invent features, endpoints, tables, or behaviors that do not exist.

## About the project (verify against the code)

StudentHub is a student academic dashboard web app. Stack: Next.js (App Router) + React + TypeScript + Tailwind CSS, Framer Motion, Lucide icons, React Hook Form + Zod, Supabase (Auth, PostgreSQL), Vitest + Testing Library. Confirm exact versions in `package.json` (it may differ from README claims).

## Deliverables — write these files

1. `README.md` — polished readme: title, tagline, feature list, tech-stack table, quick start (env setup, DB schema load, dev server), deployment note, links to `docs/`.
2. `docs/architecture.md` — file/folder map, data flow (server vs. client components, Supabase clients, middleware), module breakdown, design-system tokens.
3. `docs/auth.md` — full auth flow: login, session cookies, middleware route protection, forced first-login password change, forgot-password, RBAC role resolution (from `app_metadata` only), role-restricted routes.
4. `docs/data-model.md` — all Supabase tables, columns, keys, RLS summaries, triggers, enums, and migrations.
5. `docs/google-integration.md` — OAuth2 flow, scopes, routes (`/api/google/auth`, `/api/google/callback`), AES-256-GCM token encryption, sync (`POST /api/dashboard/sync`), Classroom/Calendar mapping to cache tables.
6. `docs/api.md` — every route handler: method, purpose, request/response, auth requirements.
7. `docs/testing.md` — test setup (`vitest.config.mts`), coverage (gpa, rbac, utils, validations), how to run.
8. `docs/deployment.md` — env vars (incl. Google client ID/secret/token encryption key), Vercel steps, Supabase CLI migrations.

## Content rules

- Reference real paths (`app/…`, `lib/…`, `services/…`, `supabase/…`).
- Distinguish implemented features from placeholders (e.g. `/dashboard/courses`, `grades`, `schedule`, `students` are `ComingSoon`).
- Note that the dashboard reads only the Supabase cache and sync is the only path that contacts Google.
- Use markdown with tables where useful, no emojis, no invented URLs or screenshots.
- Prioritize accuracy over volume.
