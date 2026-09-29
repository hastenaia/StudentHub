# QA Checklist (Day 6 integration)

Run against the shared Supabase project on a production build (`npm run build && npm start`) or the Vercel preview. Tick each box and note the tester and date. Anything failing goes to the owner in `docs/assignments/`.

Tester: ______  Date: ______  Build/commit: ______

## 1. Automated gates

- [ ] `npm test` green
- [ ] `npm run lint`: 0 errors
- [ ] `npm run build` green
- [ ] `curl -i <host>/api/health` → `200`, body `{"ok":true,…}`, header `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- [ ] `curl -i <host>/dashboard` with no session → `307` to `/login?redirectTo=%2Fdashboard`

## 2. Responsive (NFR-06): Chrome DevTools at 375, 768, 1280 px

For every dashboard page (Dashboard, Tasks, Courses, Calendar, Focus, Study Hub, Wellness, Analytics, Settings):

- [ ] No horizontal scroll at 375 px
- [ ] Sidebar collapses to the mobile drawer below `lg`, and the drawer opens/closes
- [ ] Page padding steps `p-4 → sm:p-6 → lg:p-8`
- [ ] Dialogs (New note, New event, Task form) fit at 375 px and scroll internally
- [ ] Chill Hub tiles: 1 column → `sm` 2 → `lg` 3, all 6 including Lo-fi

## 3. Empty states (fresh account, no data)

- [ ] Calendar Month / Week / Day show the "No events" hint + New event button; Agenda shows "No events in this period"
- [ ] Analytics: Focus, Productivity, Study cards show "No … yet" descriptions; Focus hours / Task velocity charts show their hint; Mood trend shows "No check-ins yet" and grey "—" (not red 0) for missing days
- [ ] Wellness card shows rule-based suggestion; no error toast when AI is unconfigured

## 4. Feature smoke (demo path)

- [ ] Chill Hub: each of 6 ambients plays; volume change survives a page reload
- [ ] Wellness: with ≥ 90 focus min today or > 3 deadlines, AI tip appears (AI configured) or rule text stays (AI off/timeout), never an error
- [ ] Notes: toolbar B/H1/code/list; attach PDF with spaces in its name → link opens; remove with × → Save → file gone from `notes-pdfs`
- [ ] AI tab: generate flashcards / quiz / summary → Save → appears in Study Hub
- [ ] AI call with a slow/blocked provider fails at ~4.5 s with "AI timed out" message

## 5. Security / privacy

- [ ] RLS: signed in as user A, `supabase.from("notes").select()` in the browser console returns only A's rows; same for `note_attachments`, `wellness_entries`
- [ ] Storage: user A cannot `createSignedUrl` for a path under user B's `notes-pdfs/<uidB>/` folder
- [ ] Leaderboard / wellness views show `Anonymous #n` / XP only, never `full_name` or `avatar_url` of other users
- [ ] Note content with `[x](javascript:alert(1))` renders as plain text, not a link

## 6. Accessibility quick pass

- [ ] Tab through Login, New note dialog, Calendar toolbar: visible focus ring, logical order, Esc/Cancel closes dialogs
- [ ] Icon-only buttons (favorite, remove PDF ×, volume) have an `aria-label`
