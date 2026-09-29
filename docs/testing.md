# Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers: task scheduling, RBAC, Zod schemas,
Supabase error mapping, and utility functions.

## Running tests

```bash
npm test                                  # run once (vitest run)
npm run test:watch                        # watch mode
npx vitest run lib/scheduling.test.ts     # a single file
npx vitest run -t "nextRecurrence"        # tests whose name matches
```

## Configuration

| File | Purpose |
|---|---|
| `vitest.config.mts` | `jsdom` environment, `@` → repo root alias, globals, setup file, includes `**/*.test.{ts,tsx}` |
| `vitest.setup.ts` | Imports `@testing-library/jest-dom/vitest` (custom matchers) |

## Test files

| File | Area under test |
|---|---|
| `lib/scheduling.test.ts` | `buildSchedule` min-heap ordering, `nextRecurrence`, `formatRecurrenceLabel` |
| `lib/dates.test.ts` | `startOfDay`/`endOfDay`, `toDateStr`, `computeStreak` |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, signup, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Manual course Zod schema |
| `lib/validations/tasks.test.ts` | `taskFormSchema`, `taskFormToDraft`, `toLocalInputValue` |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `components/study/MarkdownPreview.test.ts` | Markdown link scheme allow-list, attribute escaping, formatting inside URLs |
| `utils/cn.test.ts` | `cn()` class-name merging |
| `utils/safeRedirect.test.ts` | Open-redirect prevention in redirect targets |
| `utils/validation.test.ts` | Email validation, password strength rules, initials helper |

## What the tests verify

- **Scheduling**: the Suggested Order heap (overdue first, then by due date,
  ties broken by priority then effort, undated tasks last) and recurrence date
  math (intervals, month-end clamping, `recurUntil`) are deterministic, side-effect-free
  functions in `lib/scheduling.ts`, so they're verified without Supabase.
- **RBAC**: the role-ranking rules, role resolution defaults, and the
  longest-prefix route access lookup.
- **Zod schemas**: form validation boundaries (email format, password policy,
  credit-hour ranges, task fields, required fields) and form → draft mapping.
- **Error mapping**: Supabase auth errors map to friendly messages, with a
  generic fallback.
- **Utilities**: class merging and open-redirect protection.

## Coverage notes

Tests currently target the pure/validation layers only. The service layer
(`services/*`), route handlers (including `/api/ai/*`), and React components
are not unit-tested yet; the pure functions they depend on are.
