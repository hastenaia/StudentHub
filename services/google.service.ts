import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database.types";
import { fail, ok, type ApiResult } from "@/types/api";
import { createClient } from "@/lib/supabase/server";
import {
  buildAuthUrl,
  classroomDateToIso,
  exchangeCodeForTokens,
  fetchUserInfo,
  getOAuthConfig,
  refreshToken,
} from "@/lib/google/tokens";
import { decryptToken, encryptToken } from "@/lib/google/crypto";
import {
  listAnnouncements,
  listCourseWork,
  listCourses,
  listStudentSubmissions,
} from "./classroom.service";
import { buildWindow, listEvents } from "./calendar.service";

type GoogleAccountRow = Database["public"]["Tables"]["google_accounts"]["Row"];
/** The exact client type produced by the shared server factory. */
type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface SyncResult {
  courses: number;
  assignments: number;
  announcements: number;
  calendarEvents: number;
  lastSyncedAt: string;
}

/** Batch size for Supabase writes (keeps payloads well under limits). */
const CHUNK = 100;

/**
 * Primary facade for the Google integration. Handles the OAuth handshake
 * (storing delivered tokens) and the on-demand sync that pulls Classroom +
 * Calendar data into the Supabase cache. The dashboard never talks to Google
 * directly — it reads this cache, which keeps page loads fast and respects
 * Google's quota.
 */

/** Start the consent flow; returns the redirect URL for the caller. */
export function buildGoogleAuthUrl(): { url: string; state: string; codeVerifier: string } {
  const config = getOAuthConfig();
  return buildAuthUrl(config);
}

/**
 * Exchange the authorization code for tokens and persist them (encrypted)
 * against the Supabase user. Uses OpenID Connect's userinfo to learn the
 * linked Google identity (sub + email).
 */
export async function storeGoogleAccount(
  userId: string,
  code: string,
  codeVerifier: string
): Promise<ApiResult<{ email: string | null }>> {
  try {
    const supabase = await createClient();
    const config = getOAuthConfig();
    const tokens = await exchangeCodeForTokens(config, code, codeVerifier);
    const userInfo = await fetchUserInfo(tokens.access_token);

    if (tokens.refresh_token) {
      await supabase.from("google_accounts").upsert(
        {
          user_id: userId,
          google_subject: userInfo.sub,
          email: userInfo.email ?? null,
          access_token_enc: encryptToken(tokens.access_token),
          refresh_token_enc: encryptToken(tokens.refresh_token),
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          needs_reconnect: false,
        },
        { onConflict: "user_id" }
      );
    } else {
      // A refresh token should always arrive with access_type=offline +
      // prompt=consent; if it doesn't, fail loudly rather than store a
      // one-shot token we can never renew.
      return fail("Google did not return a refresh token. Please try again.");
    }

    return ok("Google account linked.", { email: userInfo.email ?? null });
  } catch (error) {
    return fail(mapSyncError(error, "linking your Google account"));
  }
}

/**
 * Pull everything Google knows about the user into the Supabase cache.
 * Idempotent: rerun freely. Classroom/manual coexist — manual courses are
 * never touched (they have no google_course_id and are filtered out).
 */
export async function syncGoogleData(userId: string): Promise<ApiResult<SyncResult>> {
  const supabase = await createClient();
  const { data: account, error: accountError } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError) return fail("Could not read your Google connection.");
  if (!account) return fail("Connect a Google account before syncing.");
  if (account.needs_reconnect) {
    return fail("Your Google connection needs attention — reconnect it in Settings.");
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(supabase, account);
  } catch {
    return fail("Your Google session expired — reconnect it in Settings.");
  }

  try {
    return await performSync(supabase, userId, accessToken);
  } catch (error) {
    // Surface a friendly message but keep the (possibly partial) cache so the
    // dashboard still renders rather than erroring out.
    const status = error instanceof Error && "status" in error ? (error as { status: number }).status : undefined;
    if (status === 401) {
      await markReconnect(supabase, userId);
      return fail("Google access was revoked — reconnect it in Settings.");
    }
    return fail(mapSyncError(error, "syncing your school data"));
  }
}

/** Refresh the access token if near/beyond expiry; otherwise reuse. */
async function getValidAccessToken(
  supabase: ServerClient,
  account: GoogleAccountRow
): Promise<string> {
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return decryptToken(account.access_token_enc); // still fresh — reuse
  }

  const config = getOAuthConfig();
  const refreshTokenValue = decryptToken(account.refresh_token_enc);
  const { access_token, refresh_token: nextRefresh, expires_in } = await refreshToken(
    config,
    refreshTokenValue
  );

  const { error } = await supabase
    .from("google_accounts")
    .update({
      access_token_enc: encryptToken(access_token),
      refresh_token_enc: nextRefresh ? encryptToken(nextRefresh) : account.refresh_token_enc,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      needs_reconnect: false,
    })
    .eq("user_id", account.user_id);

  if (error) throw error;
  return access_token;
}

async function markReconnect(
  supabase: ServerClient,
  userId: string
): Promise<void> {
  await supabase
    .from("google_accounts")
    .update({ needs_reconnect: true })
    .eq("user_id", userId);
}

/** Fetch + merge phase. Throws on Google/Supabase errors; caller maps them. */
async function performSync(
  supabase: ServerClient,
  userId: string,
  accessToken: string
): Promise<ApiResult<SyncResult>> {
  const lastSyncedAt = new Date().toISOString();

  // --- Courses -------------------------------------------------------------
  const googleCourses = await listCourses(accessToken);
  const googleCourseIds = new Set(googleCourses.map((c) => c.id));

  // Upsert first so we get real DB ids back for the assignment announcements.
  const { data: upsertedCourses, error: courseError } = await supabase
    .from("courses")
    .upsert(
      googleCourses.map((gc) => ({
        user_id: userId,
        google_course_id: gc.id,
        source: "classroom" as const,
        name: gc.name || "Untitled course",
        section: gc.section ?? null,
        room: gc.room ?? null,
        teacher_name: gc.ownerId ?? null,
        color: null,
        archived: false,
      })),
      { onConflict: "user_id,google_course_id" }
    )
    .select("id, google_course_id");

  if (courseError) throw courseError;

  const courseIdByGoogle = new Map<string, string>();
  for (const row of upsertedCourses ?? []) {
    if (row.google_course_id) courseIdByGoogle.set(row.google_course_id, row.id);
  }

  // Remove classroom courses that no longer exist on Google's side.
  const { data: existingCourses } = await supabase
    .from("courses")
    .select("google_course_id")
    .eq("user_id", userId)
    .eq("source", "classroom");
  const removedCourseIds = (existingCourses ?? [])
    .map((r) => r.google_course_id)
    .filter((id): id is string => !!id && !googleCourseIds.has(id));
  if (removedCourseIds.length) {
    await supabase
      .from("courses")
      .delete()
      .eq("user_id", userId)
      .eq("source", "classroom")
      .in("google_course_id", removedCourseIds);
  }

  // --- Assignments ----------------------------------------------------------
  const assignmentRows: Database["public"]["Tables"]["assignments"]["Insert"][] = [];
  const syncedWorkIds = new Set<string>();

  for (const [googleCourseId, dbCourseId] of courseIdByGoogle) {
    const courseWork = await listCourseWork(accessToken, googleCourseId);
    for (const cw of courseWork) {
      const submissions = await listStudentSubmissions(accessToken, googleCourseId, cw.id);
      const mine = submissions[0]; // student eyes only their own submission

      syncedWorkIds.add(cw.id);
      assignmentRows.push({
        user_id: userId,
        course_id: dbCourseId,
        google_course_work_id: cw.id,
        title: cw.title || "Untitled assignment",
        description: cw.description ?? null,
        due_at: classroomDateToIso(cw.dueDate, cw.dueTime),
        max_points: cw.maxPoints ?? null,
        grade: mine?.assignedGrade ?? null,
        submitted: Boolean(mine),
        state: mine?.state ?? null,
      });
    }
  }

  for (let i = 0; i < assignmentRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("assignments")
      .upsert(assignmentRows.slice(i, i + CHUNK), {
        onConflict: "user_id,google_course_work_id",
      });
    if (error) throw error;
  }

  // Remove assignments from removed courses / deleted courseWork items.
  const { data: existingAssignments } = await supabase
    .from("assignments")
    .select("google_course_work_id")
    .eq("user_id", userId);
  const removedAssignmentIds = (existingAssignments ?? [])
    .map((r) => r.google_course_work_id)
    .filter((id): id is string => !!id && !syncedWorkIds.has(id));
  if (removedAssignmentIds.length) {
    await supabase
      .from("assignments")
      .delete()
      .eq("user_id", userId)
      .in("google_course_work_id", removedAssignmentIds);
  }

  // --- Announcements ---------------------------------------------------------
  const announcementRows: Database["public"]["Tables"]["announcements"]["Insert"][] = [];
  const syncedAnnouncementIds = new Set<string>();

  for (const [googleCourseId, dbCourseId] of courseIdByGoogle) {
    const announcements = await listAnnouncements(accessToken, googleCourseId);
    for (const a of announcements) {
      syncedAnnouncementIds.add(a.id);
      announcementRows.push({
        user_id: userId,
        course_id: dbCourseId,
        google_announcement_id: a.id,
        text: a.text,
        creator_name: a.creator?.name ?? null,
        publish_time: a.creationTime ?? null,
      });
    }
  }

  for (let i = 0; i < announcementRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("announcements")
      .upsert(announcementRows.slice(i, i + CHUNK), {
        onConflict: "user_id,google_announcement_id",
      });
    if (error) throw error;
  }

  const { data: existingAnnouncements } = await supabase
    .from("announcements")
    .select("google_announcement_id")
    .eq("user_id", userId);
  const removedAnnouncementIds = (existingAnnouncements ?? [])
    .map((r) => r.google_announcement_id)
    .filter((id): id is string => !!id && !syncedAnnouncementIds.has(id));
  if (removedAnnouncementIds.length) {
    await supabase
      .from("announcements")
      .delete()
      .eq("user_id", userId)
      .in("google_announcement_id", removedAnnouncementIds);
  }

  // --- Calendar --------------------------------------------------------------
  // Calendar is a snapshot of a rolling window: replace wholesale each sync.
  const events = await listEvents(accessToken, buildWindow(new Date()));
  const eventRows: Database["public"]["Tables"]["calendar_events"]["Insert"][] = events.map(
    (e) => {
      const startAt = pickStart(e);
      return {
        user_id: userId,
        google_event_id: e.id ?? `ephemeral-${randomUUID()}`,
        summary: e.summary || "(untitled event)",
        description: e.description ?? null,
        location: e.location ?? null,
        start_at: startAt,
        end_at: e.end?.dateTime ?? (e.end?.date ? new Date(`${e.end.date}T00:00:00`).toISOString() : null),
        all_day: Boolean(e.start?.date && !e.start?.dateTime),
      };
    }
  );

  const { error: deleteEventsError } = await supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", userId);
  if (deleteEventsError) throw deleteEventsError;

  for (let i = 0; i < eventRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("calendar_events")
      .insert(eventRows.slice(i, i + CHUNK));
    if (error) throw error;
  }

  // --- Stamp sync time -------------------------------------------------------
  await supabase
    .from("google_accounts")
    .update({ last_synced_at: lastSyncedAt, needs_reconnect: false })
    .eq("user_id", userId);

  return ok("Synced your school data.", {
    courses: googleCourses.length,
    assignments: assignmentRows.length,
    announcements: announcementRows.length,
    calendarEvents: eventRows.length,
    lastSyncedAt,
  });
}

/** All-day events carry `start.date`; resolved to local midnight ISO. */
function pickStart(event: { start?: { dateTime?: string; date?: string } }): string | null {
  const dateTime = event.start?.dateTime;
  if (dateTime) return dateTime;
  if (event.start?.date) {
    const [y, m, d] = event.start.date.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).toISOString();
  }
  return null; // malformed event; keep it listable via summary only
}

/** Human-friendly message for the many ways Google can fail. */
function mapSyncError(error: unknown, action: string): string {
  if (error instanceof Error && "status" in error) {
    const status = (error as { status: number }).status;
    if (status === 429) return "Google is rate-limiting requests — try again in a few minutes.";
    if (status === 403) return `Google couldn't ${action} — the account may lack access.`;
    if (status === 401) return "Your Google session expired — reconnect it in Settings.";
  }
  return `Something went wrong ${action}. Please try again.`;
}