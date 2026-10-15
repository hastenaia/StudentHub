/**
 * View models for the Academic Dashboard. These are the shapes the UI
 * consumes — assembled server-side from the Supabase cache by the academics
 * service, never straight from Google API responses.
 */

export interface DashboardAnnouncement {
  id: string;
  text: string;
  courseName: string;
  creatorName: string | null;
  publishTime: string | null;
}

export interface GoogleAccountView {
  linked: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
}