"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import { toNotificationItems, type NotificationItem } from "@/lib/notifications";

/**
 * Client-side notification reads for the Navbar bell. Components go through
 * this layer, never Supabase directly. Read-only; RLS keeps rows owner-only.
 */
export const notificationsClientService = {
  async listNotifications(): Promise<ApiResult<NotificationItem[]>> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const [announcementsRes, overdueRes, assignmentsRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, text, course_id, publish_time, courses(name)")
        .eq("user_id", user.id)
        .order("publish_time", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("id, title, course_id, due_at, courses(name)")
        .eq("user_id", user.id)
        .neq("status", "done")
        .lt("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(5),
      supabase
        .from("assignments")
        .select("id, title, course_id, due_at, courses(name)")
        .eq("user_id", user.id)
        .gte("due_at", sinceIso)
        .order("due_at", { ascending: true })
        .limit(5),
    ]);

    const error = announcementsRes.error ?? overdueRes.error ?? assignmentsRes.error;
    if (error) return fail(error.message);

    const courseName = (row: { courses?: { name?: string | null } | { name?: string | null }[] | null }): string | null => {
      const c = row.courses;
      if (!c) return null;
      return Array.isArray(c) ? (c[0]?.name ?? null) : (c.name ?? null);
    };

    const items = toNotificationItems(
      (announcementsRes.data ?? []).map((a) => ({
        id: a.id,
        text: a.text,
        courseName: courseName(a),
        publishTime: a.publish_time,
      })),
      (assignmentsRes.data ?? [])
        .filter((a) => a.due_at)
        .map((a) => ({
          id: a.id,
          title: a.title,
          courseName: courseName(a),
          dueAt: a.due_at,
          kind: "assignment" as const,
        })),
      (overdueRes.data ?? [])
        .filter((t) => t.due_at)
        .map((t) => ({
          id: t.id,
          title: t.title,
          courseName: courseName(t),
          dueAt: t.due_at,
        }))
    );

    return ok("Notifications loaded.", items);
  },
};
