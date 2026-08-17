# Data Model

The database is PostgreSQL on Supabase. Every user-owned table enables Row
Level Security (RLS) with owner-only policies, so a user can only read/write
their own rows.

Schema source of truth:

- `supabase/schema.sql` — consolidated schema for fresh setups (run in the
  Supabase SQL Editor).
- `supabase/migrations/` — timestamped, incremental migrations applied with the
  Supabase CLI (`npm run db:migrate`).

## TypeScript types

`types/database.types.ts` is generated from the live Supabase project via
`npm run typegen` and provides row/insert/update types for every table.

## Enums

| Enum | Values | Notes |
|---|---|---|
| `public.user_role` | `student`, `teacher`, `admin` | Ordered hierarchy in `lib/rbac.ts` (`ROLE_RANK`) |

## Tables

### `profiles`

1:1 with `auth.users`; created automatically by the `on_auth_user_created`
trigger when a new auth user signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | references `auth.users(id)` on delete cascade |
| `full_name` | `text` | defaults to email when `full_name` metadata absent |
| `avatar_url` | `text` | |
| `role` | `user_role` | default `'student'`; read from `app_metadata` on insert |
| `must_change_password` | `boolean` | default `true`; forces first-login password change |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, maintained by trigger |

**RLS policies:** `Profiles are viewable by owner`, `Profiles are updatable by
owner` — `auth.uid() = id`.

**Index:** `profiles_role_idx (role)`.

**Triggers:** `on_auth_user_created` (after insert on `auth.users` →
`handle_new_user()`), `on_profiles_updated` (before update →
`handle_updated_at()`).

### `google_accounts`

Holds the linked Google identity and encrypted OAuth tokens (one row per user).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` UNIQUE | references `profiles(id)` on delete cascade |
| `google_subject` | `text` UNIQUE | Google's opaque, stable user id (OpenID `sub`) |
| `email` | `text` | linked account email, display only |
| `access_token_enc` | `text` | AES-256-GCM ciphertext |
| `refresh_token_enc` | `text` | AES-256-GCM ciphertext |
| `token_expires_at` | `timestamptz` | |
| `needs_reconnect` | `boolean` | default `false`; set when a token refresh fails |
| `last_synced_at` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

### `courses`

Classes from Google Classroom **or** manually created courses.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `google_course_id` | `text` | null for manual courses |
| `source` | `text` | `'classroom'` or `'manual'` (CHECK constraint), default `'manual'` |
| `name` | `text` | |
| `section` | `text` | |
| `room` | `text` | |
| `teacher_name` | `text` | set from the Classroom course owner for synced courses |
| `color` | `text` | |
| `credit_hours` | `numeric` | default `3.0`, CHECK `>= 0` |
| `manual_grade` | `numeric` | grade points on the configured scale, manual courses only |
| `archived` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_course_id)` — PostgreSQL allows multiple NULLs,
so several manual courses (no `google_course_id`) are permitted.

**Indexes:** `courses_user_archived_idx (user_id, archived)`.

### `assignments`

Classroom course work (per course), including due dates, points, and grades.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete cascade |
| `google_course_work_id` | `text` | null for manual assignments |
| `title` | `text` | |
| `description` | `text` | |
| `due_at` | `timestamptz` | |
| `max_points` | `numeric` | CHECK `> 0` when present |
| `grade` | `numeric` | earned points; null until graded |
| `submitted` | `boolean` | default `false` |
| `state` | `text` | raw Classroom submission state (e.g. `TURNED_IN`) |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_course_work_id)`.

**Indexes:** `assignments_user_due_idx (user_id, due_at)`,
`assignments_course_idx (course_id)`.

### `announcements`

Classroom stream announcements per course.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete cascade |
| `google_announcement_id` | `text` | |
| `text` | `text` | |
| `creator_name` | `text` | |
| `publish_time` | `timestamptz` | actual announcement creation time |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_announcement_id)`.

**Indexes:** `announcements_user_publish_idx (user_id, publish_time desc)`.

### `calendar_events`

Snapshot of the linked Google Calendar for a rolling window (replaced
wholesale on each sync).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `google_event_id` | `text` | stable Google event id (`ephemeral-*` for malformed events) |
| `summary` | `text` | |
| `description` | `text` | |
| `location` | `text` | |
| `start_at` | `timestamptz` | |
| `end_at` | `timestamptz` | |
| `all_day` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Unique:** `(user_id, google_event_id)`.

**Indexes:** `calendar_events_user_start_idx (user_id, start_at)`.

### `academic_settings`

Per-user GPA configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` UNIQUE | references `profiles(id)` on delete cascade |
| `grade_scale` | `jsonb` | default `{"A":4,"A-":3.7,...}` (letter → points) |
| `target_gpa` | `numeric` | default `3.0`, CHECK `between 0 and 4.333` |
| `updated_at` | `timestamptz` | |

## Row Level Security

All six user-owned tables (`google_accounts`, `courses`, `assignments`,
`announcements`, `calendar_events`, `academic_settings`) enable RLS and have
four owner-only policies each (select/insert/update/delete), all keyed on
`auth.uid() = user_id`. `profiles` has select/update owner policies keyed on
`auth.uid() = id`.

```
create policy "courses owner select" on public.courses for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses for update using (auth.uid() = user_id);
create policy "courses owner delete" on public.courses for delete using (auth.uid() = user_id);
```

## Functions & triggers

| Function | Trigger | Fires on | Purpose |
|---|---|---|---|
| `handle_new_user()` | `on_auth_user_created` | after insert on `auth.users` | Creates the profile row; reads role from `app_metadata` (default `student`), mirrors the role back into `app_metadata` so it appears in the JWT |
| `handle_updated_at()` | `on_<table>_updated` (profiles + all google/academic tables) | before update | Sets `updated_at = now()` |

Note on `handle_new_user`: the role is read from `raw_app_meta_data`
(admin/service-role only) — never `user_metadata`, which is client-controllable
and would allow a self-signed privilege escalation.

## Migration history

| Migration | Contents |
|---|---|
| `20260811000001_init_profiles.sql` | `profiles` table, RLS, `handle_new_user`/`handle_updated_at` triggers |
| `20260811000002_add_role_enum.sql` | `user_role` enum, re-points `profiles.role`, role-aware trigger, `profiles_role_idx` |
| `20260813000001_google_academics.sql` | `google_accounts`, `courses`, `assignments`, `announcements`, `calendar_events`, `academic_settings`; owner RLS policies, indexes, `updated_at` triggers |

`schema.sql` is the consolidation of all three migrations for fresh setups.