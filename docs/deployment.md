# Deployment

## Environment variables

Copy `.env.local.example` to `.env.local` for local development. Never commit
real values.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `GOOGLE_CLIENT_ID` | Google features only | Google OAuth client ID (`...apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Google features only | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google features only | Must match an authorized redirect URI on the OAuth client (e.g. `https://<domain>/api/google/callback`) |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Google features only | Used to AES-256-GCM encrypt Google tokens at rest |
| `OPENAI_API_KEY` (or `AI_API_KEY`) | AI features only | OpenAI-compatible key; optional `OPENAI_BASE_URL`, `AI_MODEL` / `OPENAI_MODEL` (default `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` | AI alternative | Used if no OpenAI key is set; optional `ANTHROPIC_MODEL` |
| `GOOGLE_AI_API_KEY` (or `GEMINI_API_KEY`) | AI alternative | Used if neither of the above is set; optional `GOOGLE_AI_MODEL` |

Generate the token encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app runs without the Google variables unless the Classroom/Calendar
integration is used; the OAuth config helper (`lib/google/tokens.ts`) fails
fast with a descriptive message when they're missing.

The AI variables are checked in order (OpenAI, then Anthropic, then Google)
by `lib/ai/provider.ts`; the first key found wins. Without any of them the
Study Hub AI features return a "not configured" error (HTTP 503).

## Supabase setup

1. Create a Supabase project at <https://supabase.com/>.
2. Set the two `NEXT_PUBLIC_SUPABASE_*` variables.
3. Apply the schema from `supabase/migrations/`:
   - **CLI:** `npm run db:migrate` (requires the Supabase CLI linked to the
     project).
   - **SQL Editor:** paste each migration file in timestamp order.
   `supabase/schema.sql` and `supabase/consolidated.sql` are older snapshots
   that stop at the Google tables; don't use them on their own.
   The last migration also creates the private `notes-pdfs` Storage bucket
   used for note PDF attachments.
4. **Authentication → URL Configuration:** set the Site URL
   (`http://localhost:3000` in dev, your production URL in prod) and add
   `http://localhost:3000/**` and `https://<your-domain>/**` to Redirect URLs.
   Without this, password-reset and confirmation links fall back to the Site
   URL (the proxy rescues them, but the allow-list is the proper fix).
5. **Authentication → Providers → Google** (optional): enable it for
   "Continue with Google" sign-in. This uses its own OAuth client, with
   Supabase's callback URL
   (`https://<project-ref>.supabase.co/auth/v1/callback`) as the redirect URI.
6. `npm run typegen` regenerates `types/database.types.ts` from the project
   (requires the CLI).

### Creating a test user with the first-login flow

In Supabase → Authentication → Users → "Add user", create a user with
email/password and set `must_change_password: true` in the user's metadata
(JSON) to exercise the forced password-change flow.

## Google Cloud setup (once per environment)

The Classroom/Calendar integration uses a server-side OAuth 2.0 flow with read-only scopes.
Set it up once per environment:

1. Go to <https://console.cloud.google.com/> and create a project (or reuse one).
2. From **APIs & Services → Library**, enable:
   - **Google Cloud Classroom API**
   - **Google Calendar API**
3. **APIs & Services → OAuth consent screen → External → Create.**
   - Add an app name and support email, and (mandatory for testing) add your
     own email under **Test users**. Classroom reads won't show for non-test
     users until the app is verified/published.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application.**
   - Authorized JavaScript origins: `http://localhost:3000`,
     `https://<your-domain>`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/google/callback` (dev)
     - `https://<your-domain>/api/google/callback` (prod)
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `GOOGLE_REDIRECT_URI` for the corresponding environment.
6. Set `GOOGLE_TOKEN_ENCRYPTION_KEY` (see above). Rotating it invalidates
   stored tokens; users simply reconnect.

Apply the Google data tables once (not on every deploy):

```bash
npm run db:migrate   # pushes supabase/migrations/, incl. google_academics
```

## Vercel deployment

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository.
3. Under **Settings → Environment Variables**, add the variables from the table
   above (set `GOOGLE_REDIRECT_URI` to the production callback URL and update
   the Google Cloud authorized redirect URIs accordingly).
4. Deploy. The production build runs `next build` automatically
   (`npm run build`).

## Production build

```bash
npm run build
npm start
```

The build runs TypeScript type checking. Next.js 16 no longer runs ESLint
during `next build`, so run `npm run lint` separately (e.g. in CI). `next.config.mjs` enables
`reactStrictMode` and allows images from the Supabase storage hostname
(`cbdxebzizvgzoupdplvs.supabase.co`); update the remote pattern if you use a
different Supabase project host. It also sends
`Strict-Transport-Security: max-age=63072000; includeSubDomains` on every
route (browsers ignore it over plain `http://localhost`). Point an uptime
monitor at `GET /api/health`, which returns `{ ok: true }` without a session.

## Notes & caveats

- **Secrets:** `NEXT_PUBLIC_*` vars are public (embedded in the client bundle);
  keep the anon key, not the service role key. `GOOGLE_*` and AI key vars are
  server-only.
- **Google quota:** sync is on-demand and respects Google's rate limits; a
  `429` surfaces as a friendly message.
- **Token rotation:** rotating `GOOGLE_TOKEN_ENCRYPTION_KEY` invalidates all
  stored Google tokens — users must reconnect.
- **Database migrations** should be applied before/after deploy as needed;
  `npm run db:migrate` is not part of the build.