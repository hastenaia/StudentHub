# Entity-Relationship Diagram

Mermaid ER diagrams of the `public` schema, derived from `types/database.types.ts` and `supabase/migrations/`. Column lists are trimmed to keys and a few key fields; see [data-model.md](data-model.md) for every column.

**Ownership rule (not drawn):** every table except `quiz_questions` and `badges` has `user_id → profiles.id` with owner-only RLS. `profiles.id` is itself a FK to Supabase `auth.users.id`. Dotted edges below are optional (nullable) foreign keys.

## Overview

```mermaid
erDiagram
    profiles ||--o| google_accounts : "Google link"
    profiles ||--o{ courses : owns
    profiles ||--o{ calendar_events : "Google cache"

    courses ||--o{ assignments : has
    courses ||--o{ announcements : has
    courses |o--o{ tasks : groups
    courses |o--o{ schedule_events : groups
    courses |o--o{ notes : groups
    courses |o--o{ quizzes : groups
    courses |o--o{ flashcards : groups

    tasks |o--o{ focus_sessions : "time spent"
    notes ||--o{ note_attachments : has
    notes |o--o{ flashcards : "generated from"
    quizzes ||--o{ quiz_questions : has
    quizzes ||--o{ quiz_attempts : has

    profiles ||--o{ user_badges : earns
    badges ||--o{ user_badges : "awarded as"
    profiles ||--o{ xp_ledger : earns
    profiles ||--o{ wellness_entries : logs
    profiles ||--o{ ai_cache : caches
```

## Courses and Google sync

```mermaid
erDiagram
    profiles ||--o| google_accounts : has
    profiles ||--o{ courses : owns
    profiles ||--o{ calendar_events : owns
    courses ||--o{ assignments : has
    courses ||--o{ announcements : has

    google_accounts {
        uuid user_id FK
        text refresh_token_enc
        bool needs_reconnect
    }
    courses {
        uuid id PK
        uuid user_id FK
        text name
        text source
        text google_course_id
    }
    assignments {
        uuid id PK
        uuid course_id FK
        text title
        timestamptz due_at
        numeric grade
    }
    announcements {
        uuid id PK
        uuid course_id FK
        text text
    }
    calendar_events {
        uuid id PK
        text google_event_id
        timestamptz start_at
    }
```

## Planning

```mermaid
erDiagram
    courses |o--o{ tasks : groups
    courses |o--o{ schedule_events : groups
    courses |o--o{ focus_sessions : groups
    tasks |o--o{ focus_sessions : "time spent"

    tasks {
        uuid id PK
        uuid course_id FK
        text title
        text status
        text priority
        timestamptz due_at
        text recurrence_freq
    }
    schedule_events {
        uuid id PK
        uuid course_id FK
        text event_type
        timestamptz start_at
        timestamptz end_at
    }
    focus_sessions {
        uuid id PK
        uuid course_id FK
        uuid task_id FK
        int duration_minutes
    }
```

## Study Hub

```mermaid
erDiagram
    courses |o--o{ notes : groups
    courses |o--o{ flashcards : groups
    courses |o--o{ quizzes : groups
    notes ||--o{ note_attachments : has
    notes |o--o{ flashcards : "generated from"
    quizzes ||--o{ quiz_questions : has
    quizzes ||--o{ quiz_attempts : has

    notes {
        uuid id PK
        uuid course_id FK
        text title
        text content
    }
    note_attachments {
        uuid id PK
        uuid note_id FK
        text file_url
    }
    flashcards {
        uuid id PK
        uuid course_id FK
        uuid note_id FK
        text front
        text back
    }
    quizzes {
        uuid id PK
        uuid course_id FK
        text title
    }
    quiz_questions {
        uuid id PK
        uuid quiz_id FK
        text question_text
        int position
    }
    quiz_attempts {
        uuid id PK
        uuid quiz_id FK
        int score
        int total
    }
```

## Profile, gamification and wellness

```mermaid
erDiagram
    profiles ||--o{ xp_ledger : earns
    profiles ||--o{ user_badges : earns
    badges ||--o{ user_badges : "awarded as"
    profiles ||--o{ wellness_entries : logs
    profiles ||--o{ ai_cache : caches

    profiles {
        uuid id PK
        user_role role
        int total_xp
        int current_streak
    }
    xp_ledger {
        uuid id PK
        int points
        text dedupe_key
    }
    badges {
        uuid id PK
        text slug
        int xp_threshold
    }
    user_badges {
        uuid user_id FK
        uuid badge_id FK
    }
    wellness_entries {
        uuid id PK
        date entry_date
        int mood
    }
    ai_cache {
        uuid id PK
        text action
        text cache_key
    }
```

## Notes

- `academic_settings` (1:1 with `profiles`) and `courses.manual_grade` are unused leftovers, so they are omitted.
- Google-sourced rows (`courses`, `assignments`, `announcements`, `calendar_events`) carry a `google_*_id` used as the upsert key by `POST /api/dashboard/sync`.
- `xp_ledger.dedupe_key` makes XP grants idempotent (`grant_xp`, `award_*_xp`).
