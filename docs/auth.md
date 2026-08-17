# Authentication & RBAC

StudentHub uses **Supabase Auth** with email/password sign-in. Sessions are
stored in HTTP-only cookies managed through `@supabase/ssr` and refreshed in
Next.js middleware on every request.

## Session management

Three Supabase clients exist, all typed against `types/database.types.ts`:

| Client | File | Where it's used |
|---|---|---|
| Browser | `lib/supabase/client.ts` (`createBrowserClient`) | Client Components |
| Server | `lib/supabase/server.ts` (wraps `cookies()`) | Server Components, Route Handlers |
| Middleware | `lib/supabase/factory.ts` (`createServerCookieClient`) | Next.js middleware |

The shared cookie plumbing for server-side usage lives in
`lib/supabase/factory.ts`, so Server Components, Route Handlers, and middleware
don't each re-implement it.

All auth operations go through `services/auth.service.ts` (`authService`),
which wraps `supabase.auth.*` calls and returns a consistent `ApiResult`
(`types/api.ts`). Supabase errors are mapped to friendly messages in
`lib/supabase/errors.ts`.

## Routes

| Route | Public? | Purpose |
|---|---|---|
| `/login` | Yes | Sign in |
| `/forgot-password` | Yes | Request a password reset email |
| `/auth/callback` | Yes | Exchange a Supabase auth code for a session |
| `/change-password` | Yes* | Change password (first-login forced or on demand) |
| `/dashboard/*` | No | Authenticated app |

`*` `/change-password` is public so an unauthenticated user who follows the
email reset link can still set a new password; authenticated users with
`must_change_password` set are redirected here too.

`PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth/callback", "/change-password"]`
is defined in `lib/supabase/middleware.ts`.

## Middleware protection

`middleware.ts` matches all routes except static assets and forwards to
`updateSession` in `lib/supabase/middleware.ts`. The middleware:

1. Creates a Supabase cookie client bound to the request.
2. Calls `auth.getUser()` to load the session.
3. **Unauthenticated + non-public route** → redirect to `/login?redirectTo=<path>`.
4. **Authenticated + visiting `/login` or `/`** → redirect to `/dashboard`.
5. **First-login flag set** (`user_metadata.must_change_password === true`) and
   not already on `/change-password` → redirect to `/change-password`.
6. **Route-level RBAC** — if the path requires roles (see `lib/rbac.ts`) and
   the user's role is insufficient → redirect to `/dashboard`.

## Sign in

- `components/auth/LoginForm.tsx` (React Hook Form + Zod via `loginSchema`).
- `authService.login({ email, password })` calls `signInWithPassword`.
- On success the client redirects through `safeRedirect(searchParams.get("redirectTo"))`
  (defaults to `/dashboard`) and calls `router.refresh()` so the server
  component tree re-renders with the new session.
- `utils/safeRedirect.ts` only allows same-origin relative paths, preventing
  open-redirect attacks.

## First-login forced password change

- When a user is created, the profile trigger defaults
  `must_change_password` to `true` (see `supabase/schema.sql`).
- Middleware reads `user.user_metadata.must_change_password` and blocks entry
  to the app until the password is changed.
- `components/auth/ChangePasswordForm.tsx` calls
  `authService.changePassword({ newPassword })`, which runs
  `supabase.auth.updateUser({ password, data: { must_change_password: false } })`
  to clear the flag, then the user can access `/dashboard`.
- The same page serves the "change password from Settings" flow; the page
  header switches based on whether `isFirstLogin` is true
  (`app/(auth)/change-password/page.tsx`).

## Password reset (forgot password)

1. `components/auth/ForgotPasswordForm.tsx` → `authService.requestPasswordReset({ email })`.
2. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where
   `redirectTo` is `${window.location.origin}/auth/callback?next=/change-password`.
3. The email link hits `/auth/callback`, which exchanges the code for a session
   and redirects to the `next` target (`/change-password`).
4. The user sets a new password and is signed in.

For security the service always returns the generic message
"If an account exists for that email, a reset link is on its way." regardless
of whether the account exists.

## Auth callback

`app/auth/callback/route.ts` handles both the reset flow and any
Supabase-generated auth code. It:

- Reads `code` and an optional `next` param (`safeRedirect`-sanitized).
- Exchanges the code for a session with `supabase.auth.exchangeCodeForSession(code)`.
- Redirects to `${origin}${next}` on success, or `/login?error=auth-callback-failed`
  otherwise.

## Logout

`authService.logout()` calls `supabase.auth.signOut()`; the `useAuth` hook then
clears local user state and routes to `/login`.

## Client state

`hooks/useAuth.ts` hydrates the current user from `auth.getUser()`, subscribes
to `onAuthStateChange`, and exposes `{ user, isLoading, isAuthenticated, logout }`.
The `AuthUser` shape (`types/auth.ts`) maps `user_metadata.full_name`,
`avatar_url`, role (via `roleFromUser`), and the `must_change_password` flag.

## Role-based access control (RBAC)

Roles are modeled as a `public.user_role` enum: `student` (0) < `teacher` (1) <
`admin` (2).

### Role source of truth

The role lives in two places that are kept in sync by the
`handle_new_user()` trigger (`supabase/schema.sql`):

- **`profiles.role`** (database) — read by the server guard `requireRole`.
- **`app_metadata.role`** (JWT) — read by middleware and the client hook.

The role is always resolved from `app_metadata` (via `roleFromUser` in
`lib/rbac.ts`), never from `user_metadata`, because `user_metadata` is
client-controllable and would allow a self-signed privilege escalation.
`app_metadata` is only writable via the service role / admin API.

### Enforcement points

| Layer | Guard | File |
|---|---|---|
| Middleware (edge) | Route-level access map | `lib/supabase/middleware.ts` + `lib/rbac.ts` |
| Server Component | `requireRole("teacher")` → redirects | `lib/requireRole.ts` |
| Client | `useRole().has("admin")` → conditional UI | `hooks/useRole.ts` |

### Route access map

`lib/rbac.ts` exports `ROUTE_ROLES`, an array of `{ prefix, roles }` pairs.
More-specific (longer) prefixes win. Currently:

```ts
{ prefix: "/dashboard/students", roles: ["teacher", "admin"] }
```

`getRequiredRoles(path)` returns the required roles for a path or `null` if the
path is open. `hasRole(role, required)` compares ranks via `ROLE_RANK`.

### Server guard

`lib/requireRole.ts` reads the role from the `profiles` table (database source
of truth), falling back to the JWT-backed `app_metadata` role if the profile is
missing. It redirects unauthenticated users to `/login` and
under-privileged users to `/dashboard`:

```ts
const role = await requireRole("teacher");
```

### Client hook

`hooks/useRole.ts` derives the role from the current auth session
(`useAuth`), defaulting to `"student"`, and exposes
`has(required)` / `isAtLeast(required)`.

## Password policy

Password rules live in `utils/validation.ts` (`PASSWORD_RULES`) and are
enforced by the Zod schema `passwordSchema` in `lib/validations/auth.ts`:
at least 8 characters, one uppercase, one lowercase, one number. The change
password form also requires the confirmation to match
(`changePasswordSchema`).

## Auth forms & schemas

| Form | Schema | File |
|---|---|---|
| Login | `loginSchema` | `lib/validations/auth.ts` |
| Forgot password | `forgotPasswordSchema` | `lib/validations/auth.ts` |
| Change password | `changePasswordSchema` | `lib/validations/auth.ts` |

All forms use React Hook Form with the `zodResolver` and the reusable UI
primitives in `components/ui/form.tsx`.
