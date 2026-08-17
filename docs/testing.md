# Testing

StudentHub uses **Vitest** with **Testing Library** and **jsdom**. Tests cover
the pure logic and validation layers — GPA math, RBAC, Zod schemas, Supabase
error mapping, and utility functions.

## Running tests

```bash
npm test          # run once (vitest run)
npm run test:watch  # watch mode
```

## Configuration

| File | Purpose |
|---|---|
| `vitest.config.mts` | Test config: `jsdom` environment, `@` → repo root alias, globals, setup file, includes `**/*.test.{ts,tsx}` |
| `vitest.setup.ts` | Imports `@testing-library/jest-dom/vitest` (custom matchers) |

## Test files

| File | Area under test |
|---|---|
| `lib/gpa.test.ts` | Grade-scale conversion, weighted GPA, needed-average projection, assignment projection |
| `lib/rbac.test.ts` | Role hierarchy (`hasRole`, `ROLE_RANK`), `roleFromUser`, route access map (`getRequiredRoles`) |
| `lib/validations/auth.test.ts` | Login, forgot-password, and change-password Zod schemas |
| `lib/validations/academics.test.ts` | Academic settings and manual course Zod schemas |
| `lib/supabase/errors.test.ts` | Friendly auth error message mapping |
| `utils/cn.test.ts` | `cn()` class-name merging |
| `utils/safeRedirect.test.ts` | Open-redirect prevention in redirect targets |
| `utils/validation.test.ts` | Email validation, password strength rules, initials helper |

## What the tests verify

- **GPA math** — `lib/gpa.ts` is intentionally written as deterministic,
  side-effect-free functions so the entire model (quality-points / attempted
  credits weighted average, classroom percentage → scale conversion, goal
  projections) can be verified without Supabase or the network.
- **RBAC** — the role-ranking rules, role resolution defaults, and the
  longest-prefix route access lookup.
- **Zod schemas** — form validation boundaries (email format, password policy,
  GPA target range 0–4.33, credit-hour ranges, required fields).
- **Error mapping** — Supabase auth errors map to friendly messages, with a
  generic fallback.
- **Utilities** — class merging and open-redirect protection.

## Coverage notes

Tests currently target the pure/validation layers only. The service layer
(`services/*`), route handlers, and React components are not unit-tested yet;
the pure functions they depend on are.