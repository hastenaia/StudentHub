# Authentication & RBAC

StudentHub uses **Supabase Auth** with email/password and Google sign-in.
Sessions are stored in HTTP-only cookies managed through `@supabase/ssr` and
refreshed by the Next.js request proxy (`proxy.ts`) on every request.

## Session management

Three Supabase client entry points exist, all typed against
`types/database.types.ts`:

| Client | File | Where it's used |
|---|---|---|
| Browser | `lib/supabase/client.ts` (`createBrowserClient`) | Client Components, client services |
| Server | `lib/supabase/server.ts` (wraps `cookies()`) | Server Components, Route Handlers |
| Proxy | `lib/supabase/factory.ts` (`createServerCookieClient`) | `lib/supabase/middleware.ts` |

The shared cookie plumbing lives in `lib/supabase/factory.ts`, so Server
Components, Route Handlers and the proxy don't each re-implement it.

All auth operations go through `services/auth.service.ts` (`authService`),
which wraps `supabase.auth.*` calls and returns a consistent `ApiResult`
(`types/api.ts`). Supabase errors are mapped to friendly messages in
`lib/supabase/errors.ts`.

## Routes

| Route | Public? | Purpose |
|---|---|---|
| `/login` | Yes | Sign in (email/password or Google) |
| `/signup` | Yes | Create an account |
| `/forgot-password` | Yes | Request a password reset email |
| `/reset-password` | Yes | Set a new password from a reset link (handles `?code=`, `?token_hash=`, hash fragments) |
| `/auth/callback` | Yes | Exchange a Supabase auth code / OTP token for a session |
| `/auth/confirm` | Yes | Verify a Supabase OTP token (`?token_hash=&type=`) |
| `/change-password` | Yes* | Change password (first-login forced or on demand) |
| `/dashboard/*` | No | Authenticated app |

`*` `/change-password` and `/reset-password` are public so a user following
an email reset link can still set a new password. Authenticated users with
`must_change_password` set are redirected to `/change-password` (recovery
links land on `/reset-password` instead).

`PUBLIC_ROUTES` is defined in `lib/supabase/middleware.ts`; any new public
page must be added there.

## Proxy protection

Next.js 16 renamed `middleware.ts` to `proxy.ts`. `proxy.ts` matches every
route except static assets and forwards to `updateSession` in
`lib/supabase/middleware.ts`, which:

1. **Rescues stray auth links**: a request with `?code=`, `?token_hash=` or
   `?error=` that isn't already on `/auth/callback`, `/auth/confirm` or
   `/reset-password` is redirected to `/auth/callback` (with
   `next=/reset-password` if no `next` is set). This covers Supabase falling
   back to the Site URL when the redirect allow-list isn't configured.
2. Creates a Supabase cookie client bound to the request.
3. Calls `auth.getUser()` to load the session. No code may run between client
   creation and this call.
4. **Unauthenticated + non-public route**: redirect to `/login?redirectTo=<path>`.
5. **Authenticated + visiting `/login` or `/`**: redirect to `/dashboard`.
6. **First-login flag set** (`user_metadata.must_change_password === true`)
   and not on `/change-password` or `/reset-password`: redirect to
   `/change-password`.
7. **Route-level RBAC**: if the path requires roles (see `lib/rbac.ts`) and
   the user's role is insufficient, redirect to `/dashboard`.

## Sign up

- `components/auth/SignupForm.tsx` uses `signupSchema`.
- `authService.signup({ fullName, email, password })` calls `auth.signUp`
  with `user_metadata = { full_name, must_change_password: false }`, so
  self-registered users skip the forced password change.
- `emailRedirectTo` is `/auth/callback?next=/login?confirmed=true`. If email
  confirmation is enabled no session is returned, and the user is told to
  check their email.

## Sign in

- `components/auth/LoginForm.tsx` (React Hook Form + Zod via `loginSchema`).
- `authService.login({ email, password })` calls `signInWithPassword`.
- On success the client redirects through
  `safeRedirect(searchParams.get("redirectTo"))` (defaults to `/dashboard`) and
  calls `router.refresh()` so the server component tree re-renders with the
  new session.
- `utils/safeRedirect.ts` only allows same-origin relative paths, preventing
  open-redirect attacks.

### Google sign-in

"Continue with Google" calls `authService.signInWithGoogle(next)`, which runs
`supabase.auth.signInWithOAuth({ provider: "google" })` with
`redirectTo = /auth/callback?next=<redirectTo>`. The Google provider must be
enabled in Supabase → Authentication → Providers.

This is separate from the Classroom/Calendar link in
[google-integration.md](google-integration.md): Google sign-in authenticates
the StudentHub account through Supabase, while the Classroom/Calendar link is
StudentHub's own OAuth flow with read-only API scopes and encrypted token
storage.

## First-login forced password change

- The profile trigger (`handle_new_user`) copies `must_change_password` from
  user metadata, defaulting to `true` when absent. Users created by an admin
  in the Supabase dashboard therefore get the forced change; self-signups set
  it to `false`.
- The proxy reads `user.user_metadata.must_change_password` and blocks entry
  to the app until the password is changed.
- `components/auth/ChangePasswordForm.tsx` calls
  `authService.changePassword({ newPassword })`, which runs
  `supabase.auth.updateUser({ password, data: { must_change_password: false } })`
  to clear the flag.
- The same page serves the "change password from Settings" flow; the header
  switches on `isFirstLogin` (`app/(auth)/change-password/page.tsx`).

## Password reset (forgot password)

1. `components/auth/ForgotPasswordForm.tsx` calls `authService.requestPasswordReset({ email })`.
2. That calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` with
   `redirectTo = ${window.location.origin}/auth/callback?next=/reset-password`.
3. The email link hits `/auth/callback`, which exchanges the code for a session
   (or verifies `token_hash`/`type` via `verifyOtp`) and redirects to
   `/reset-password`.
4. `app/(auth)/reset-password/page.tsx` + `components/auth/ResetPasswordForm.tsx`
   verify any leftover `?code=` / `?token_hash=` params client-side
   (`verifyRecoveryCode` / `verifyRecoveryToken`) and listen for
   `PASSWORD_RECOVERY` for hash-fragment links. The user then sets a new
   password via `authService.changePassword`.

For security the service always returns the generic message
"If an account exists for that email, a reset link is on its way." regardless
of whether the account exists.

The Supabase project must list the app URLs under Authentication → URL
Configuration (Site URL plus `http://localhost:3000/**` and
`https://<prod>/**` in Redirect URLs), or reset links fall back to the Site
URL and rely on the proxy's rescue step.

## Auth callback

`app/auth/callback/route.ts` handles the reset flow, email confirmation,
Google sign-in and any Supabase-generated auth code. It:

- Reads `code`, `token_hash`/`type`, an optional provider `error` /
  `error_description`, and an optional `next` param (`safeRedirect`-sanitized,
  default `/dashboard`).
- If Supabase returned an error without a code or token, redirects to `next`
  with the error params so the target page can explain it.
- Exchanges the code with `supabase.auth.exchangeCodeForSession(code)`, or
  verifies OTP links with `supabase.auth.verifyOtp({ token_hash, type })`.
- Redirects to `${origin}${next}` on success, or to `next` with
  `?error=auth-callback-failed` on failure. With no code or token it redirects
  to `/login?error=auth-callback-failed`.

`app/auth/confirm/route.ts` is a thin alias for OTP (`token_hash`) links,
defaulting `next` to `/reset-password`.

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

The `handle_new_user()` trigger writes the role to `profiles.role` and mirrors
it into `app_metadata.role` so it appears in the JWT. All access checks
resolve the role from `app_metadata` via `roleFromUser` in `lib/rbac.ts`
(default `student`), never from `user_metadata`, because `user_metadata` is
client-controllable and would allow a self-signed privilege escalation.
`app_metadata` is only writable via the service role / admin API.

### Enforcement

The only enforcement point is the proxy (`lib/supabase/middleware.ts` +
`lib/rbac.ts`). `lib/rbac.ts` holds `ROUTE_ROLES`, a module-private array of
`{ prefix, roles }` pairs where the longest matching prefix wins. It is
currently empty, so every dashboard page is open to any authenticated user.

- `getRequiredRoles(path)` returns the required roles for a path, or `null` if
  the path is open.
- `hasRole(role, required)` compares ranks via `ROLE_RANK`.

There is no server-component guard or client role hook; add one alongside the
first staff-only route if needed.

## Password policy

Password rules live in `utils/validation.ts` (`PASSWORD_RULES`) and are
enforced by `passwordSchema` in `lib/validations/auth.ts`: at least 8
characters, one uppercase, one lowercase, one number. Signup and change
password also require the confirmation to match.

## Auth forms & schemas

| Form | Schema | File |
|---|---|---|
| Login | `loginSchema` | `lib/validations/auth.ts` |
| Signup | `signupSchema` | `lib/validations/auth.ts` |
| Forgot password | `forgotPasswordSchema` | `lib/validations/auth.ts` |
| Change / reset password | `changePasswordSchema` | `lib/validations/auth.ts` |

All forms use React Hook Form with `zodResolver` and the reusable UI
primitives in `components/ui/form.tsx`.
