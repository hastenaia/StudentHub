-- Resolves Supabase linter warnings (0011, 0028, 0029).

-- 0011: pin search_path on the updated_at trigger function.
alter function public.handle_updated_at() set search_path = '';

-- 0028/0029: trigger-only SECURITY DEFINER functions must not be callable via
-- /rest/v1/rpc. Triggers fire regardless of EXECUTE grants, so revoking is safe.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile_xp() from public, anon, authenticated;

-- award_task_xp / award_focus_xp / award_journal_xp are intentionally callable by
-- signed-in users (the app invokes them via RPC); they are already revoked from
-- anon and are the only way to change XP counters. Their 0029 warnings are expected.
