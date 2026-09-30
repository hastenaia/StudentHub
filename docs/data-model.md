# Data Model

The database is PostgreSQL on Supabase. Every user-owned table enables Row
Level Security (RLS) with owner-only policies, so a user can only read/write
their own rows.

Schema source of truth is `supabase/migrations/`: timestamped, incremental
migrations applied with the Supabase CLI (`npm run db:migrate`) or pasted in
order into the SQL Editor.

`supabase/schema.sql` (profiles + role enum) and `supabase/consolidated.sql`
(profiles + role enum + Google tables) are older single-file snapshots. They
do **not** include the tasks, schedule, focus, notes, study hub, wellness,
preferences or attachment migrations, so after running one of them you must
still apply the later migrations.

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
| `must_change_password` | `boolean` | default `true`; copied from user metadata on insert (self-signups send `false`) |
| `timezone` | `text` | default `'UTC'` |
| `theme` | `text` | `light` / `dark` / `system` (default) |
| `default_calendar_view` | `text` | `month` (default) / `week` / `day` / `agenda` |
| `default_task_view` | `text` | `kanban` (default) / `list` |
| `notifications_enabled` | `boolean` | default `true` |
| `total_xp` | `integer` | default `0`; written only by the award functions (guard trigger) |
| `current_streak` / `longest_streak` | `integer` | default `0`; consecutive active days (user's `timezone`) |
| `last_active_date` | `date` | last day an award was granted; drives the streak |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, maintained by trigger |

**RLS policies:** `Profiles are viewable by owner`, `Profiles are updatable by
owner` — `auth.uid() = id`.

**Index:** `profiles_role_idx (role)`.

**Triggers:** `on_auth_user_created` (after insert on `auth.users` →
`handle_new_user()`), `on_profiles_updated` (before update →
`handle_updated_at()`), `on_profiles_xp_guard` (before update →
`guard_profile_xp()`; rejects client writes to the XP/streak columns).

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
| `manual_grade` | `numeric` | legacy GPA field; no longer used by the app |
| `target_pct` | `numeric` | legacy per-course grade goal (0–100); no longer used by the app |
| `course_code` | `text` | short code such as `CS101` |
| `course_name` | `text` | canonical name; backfilled from and kept in sync with `name` |
| `instructor` | `text` | canonical instructor; backfilled from and kept in sync with `teacher_name` |
| `description` | `text` | |
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
| `weight` | `numeric` | default `1`, CHECK `> 0`; weight in the 0–100 course score (`lib/progress.ts`); never written by the sync |
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

### `schedule_events`

User-created calendar entries (full CRUD). Separate from `calendar_events`,
which is the read-only Google snapshot that each sync replaces.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title` | `text` | |
| `description`, `location`, `color` | `text` | |
| `event_type` | `text` | `class` / `assignment` / `exam` / `study_session` / `personal` / `other` (default) |
| `start_at`, `end_at` | `timestamptz` | CHECK `end_at > start_at` |
| `all_day` | `boolean` | default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, start_at)`, `(user_id, course_id)`,
`(user_id, event_type)`, `(user_id, event_type, start_at)`.

### `tasks`

To-Do Tracker items.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title`, `description` | `text` | |
| `status` | `text` | `todo` (default) / `in_progress` / `done` |
| `priority` | `text` | `urgent` / `high` / `medium` (default) / `low` |
| `tags` | `text[]` | default `{}` |
| `due_at` | `timestamptz` | |
| `estimate_minutes` | `integer` | `> 0` when set |
| `recurrence_freq` | `text` | null / `daily` / `weekly` / `monthly` |
| `recurrence_interval` | `integer` | 1–31, default 1 |
| `recur_until` | `timestamptz` | |
| `sort_order` | `integer` | manual ordering within a column |
| `completed_at` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, status)`, `(user_id, due_at)`,
`(user_id, status, completed_at)`.

### `focus_sessions`

Completed Pomodoro/focus sessions.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `duration_minutes` | `integer` | 1–480 |
| `started_at`, `ended_at` | `timestamptz` | |
| `task_id` | `uuid` | references `tasks(id)` on delete set null |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `created_at` | `timestamptz` | |

**Indexes:** `(user_id, started_at desc)`, `(user_id, task_id)`.

### `notes`

Study Hub notes (Markdown content).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `title` | `text` | |
| `content` | `text` | |
| `favorite` | `boolean` | default `false` |
| `tags` | `text[]` | default `{}` (GIN-indexed) |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `(user_id, created_at desc)`, `(user_id, updated_at desc)`,
`(user_id, course_id)`, `(user_id, favorite)`, GIN on `tags`.

### `note_attachments`

PDF files attached to notes. The file itself lives in the private
`notes-pdfs` Storage bucket under `<user_id>/...`; `file_url` holds the
storage path, and the UI creates short-lived signed URLs to open it.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `note_id` | `uuid` | references `notes(id)` on delete cascade |
| `file_url` | `text` | storage object path |
| `file_name` | `text` | original file name |
| `created_at` | `timestamptz` | |

RLS has select/insert/delete owner policies (no update). Storage policies on
`storage.objects` restrict `notes-pdfs` objects to paths whose first folder is
the caller's `auth.uid()`.

### `flashcards`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `course_id` | `uuid` | references `courses(id)` on delete set null |
| `note_id` | `uuid` | references `notes(id)` on delete set null |
| `front`, `back` | `text` | |
| `tags` | `text[]` | default `{}` |
| `is_known` | `boolean` | default `false` |
| `correct_count`, `incorrect_count` | `integer` | default `0` |
| `last_reviewed` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

### `quizzes`, `quiz_questions`, `quiz_attempts`

| Table | Key columns | Notes |
|---|---|---|
| `quizzes` | `user_id`, `course_id`, `title`, `description` | owner RLS on `user_id` |
| `quiz_questions` | `quiz_id` (cascade), `question_text`, `question_type` (`multiple_choice` / `true_false` / `short_answer`), `options jsonb`, `correct_answer`, `explanation`, `position` | no `user_id`; RLS checks ownership of the parent quiz |
| `quiz_attempts` | `quiz_id` (cascade), `user_id`, `answers jsonb`, `score`, `total`, `created_at` | select/insert only; the quiz owner can also read attempts |

### `wellness_entries`

Daily mood check-in and journal (habit data, not medical data). One row per
user per day.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `profiles(id)` on delete cascade |
| `entry_date` | `date` | default `current_date`; UNIQUE with `user_id` (upsert key) |
| `mood` | `smallint` | 1–5 |
| `journal` | `text` | |
| `created_at` / `updated_at` | `timestamptz` | |

### `badges`, `user_badges`, `xp_ledger` (gamification)

- `badges` — seeded catalogue (`slug` unique, `name`, `description`,
  `xp_threshold`). `xp_threshold > 0` unlocks by total XP; `0` unlocks by an
  event (`first-task`, `focus-25`, `streak-7`). Readable by everyone.
- `user_badges` — earned badges, UNIQUE `(user_id, badge_id)`.
- `xp_ledger` — one row per award, UNIQUE `(user_id, dedupe_key)`, which makes
  every award idempotent (`task:<id>`, `task:<id>:<date>` for recurring tasks,
  `focus:<session id>`, `journal:<date>`).

`user_badges` and `xp_ledger` have owner **select** policies only; they are
written exclusively by the SECURITY DEFINER functions below.

### `academic_settings` (unused)

Created by the Google academics migration for the removed GPA feature
(`grade_scale jsonb`, `target_gpa numeric`, one row per user). No application
code reads or writes it anymore.

## Row Level Security

Every user-owned table enables RLS. Tables with a `user_id` column have
owner-only policies keyed on `auth.uid() = user_id`, typically all four of
select/insert/update/delete:

```
create policy "courses owner select" on public.courses for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses for update using (auth.uid() = user_id);
create policy "courses owner delete" on public.courses for delete using (auth.uid() = user_id);
```

Exceptions: `profiles` has select/update policies keyed on `auth.uid() = id`;
`quiz_questions` checks ownership through its parent quiz; `quiz_attempts`
and `note_attachments` have no update policy.

## Functions & triggers

| Function | Trigger | Fires on | Purpose |
|---|---|---|---|
| `handle_new_user()` | `on_auth_user_created` | after insert on `auth.users` | Creates the profile row (`full_name`, `must_change_password` from user metadata); reads role from `app_metadata` (default `student`) and mirrors it back into `app_metadata` so it appears in the JWT |
| `handle_updated_at()` | `on_<table>_updated` | before update | Sets `updated_at = now()` on tables with an `updated_at` column |
| `guard_profile_xp()` | `on_profiles_xp_guard` | before update on `profiles` | Rejects changes to `total_xp` / streak columns unless `grant_xp` set its transaction-local bypass flag |
| `award_task_xp(task_id)` | — (RPC) | client call | 10 XP (high 15, urgent 20), +5 if completed after `due_at`; task must be `done` (once per task) or recurring (once per task per day) |
| `award_focus_xp(session_id)` | — (RPC) | client call | 15 XP for a 25+ min session, else 1 per 5 min; 60 focus XP per day |
| `award_journal_xp(entry_date)` | — (RPC) | client call | 2 XP for a day with a non-empty journal |
| `grant_xp(...)` / `user_local_date(...)` | — (internal) | not client-callable | Ledger insert, counters, streak in the user's timezone, badge unlocks |

The award RPCs compute points from the referenced row (after checking it
belongs to `auth.uid()`), so a client can't choose its own XP.

Note on `handle_new_user`: the role is read from `raw_app_meta_data`
(admin/service-role only), never `user_metadata`, which is client-controllable
and would allow a self-signed privilege escalation.

## Migration history

| Migration | Contents |
|---|---|
| `20260811000001_init_profiles.sql` | `profiles` table, RLS, `handle_new_user`/`handle_updated_at` triggers |
| `20260811000002_add_role_enum.sql` | `user_role` enum, re-points `profiles.role`, role-aware trigger, `profiles_role_idx` |
| `20260813000001_google_academics.sql` | `google_accounts`, `courses`, `assignments`, `announcements`, `calendar_events`, `academic_settings` |
| `20260815000001_add_course_target_pct.sql` | `courses.target_pct` (now unused) |
| `20260816000001_create_tasks.sql` | `tasks` |
| `20260822000001_add_course_management_fields.sql` | `courses.course_code`, `course_name`, `instructor`, `description` + backfill |
| `20260823000001_create_schedule_events.sql` | `schedule_events` |
| `20260824000001_create_focus_and_notes.sql` | `focus_sessions`, `notes` |
| `20260825000001_create_study_hub.sql` | `notes.favorite`/`tags`, `flashcards`, `quizzes`, `quiz_questions`, `quiz_attempts` |
| `20260826000001_create_wellness_entries.sql` | `wellness_entries` |
| `20260827000001_add_profile_preferences.sql` | `profiles` timezone/theme/default views/notifications |
| `20260906000001_perf_indexes.sql` | Composite indexes for sorted/filtered queries |
| `20260907000003_note_attachments.sql` | `note_attachments`, private `notes-pdfs` Storage bucket + policies |
| `20260930000001_add_assignment_weight.sql` | `assignments.weight` (default 1) for the weighted 0–100 course score |
| `20260930000002_gamification.sql` | `profiles` XP/streak columns, `badges`, `user_badges`, `xp_ledger`, XP guard trigger, `award_*_xp` RPCs |

After adding a migration, run `npm run typegen` to regenerate
`types/database.types.ts`.
