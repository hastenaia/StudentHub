import { createHash, randomBytes } from "node:crypto";
import type {
  GoogleDate,
  GoogleTimeOfDay,
  GoogleTokenResponse,
  GoogleUserInfo,
} from "@/types/google";
import { GOOGLE_SCOPES } from "@/types/google";

/**
 * Pure OAuth 2.0 mechanics for linking a user's Google account (server-only).
 *
 * Uses the authorization-code + PKCE flow with access_type=offline so we get
 * both an access token and a refresh token. Everything here is stateless —
 * persisting tokens, refreshing near expiry, and encrypting them happens in
 * the calling service so this file stays trivially testable.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Read OAuth credentials from env; fail fast with a descriptive message. */
export function getOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET " +
        "and GOOGLE_REDIRECT_URI (see .env.local.example)."
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** Base64url without padding (the safe alphabet for PKCE + state). */
function base64Url(bytes: Buffer): string {
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** Stateless-page-random verifier; 64 chars, well within PKCE's 43-128 range. */
export function generateCodeVerifier(): string {
  return base64Url(randomBytes(48));
}

/** S256 challenge = base64url(sha256(verifier)), as OAuth PKCE expects. */
export function codeChallengeFromVerifier(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64Url(randomBytes(24));
}

export interface AuthUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
}

/** Build the consent-screen URL. prompt=consent forces a refresh token back. */
export function buildAuthUrl(config: GoogleOAuthConfig): AuthUrlResult {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return { url: `${AUTH_URL}?${params.toString()}`, state, codeVerifier };
}

/** Exchange the authorization code for tokens using the PKCE verifier. */
export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  return postTokenRequest(body);
}

/** Refresh an access token with a stored (decrypted) refresh token. */
export async function refreshToken(
  config: GoogleOAuthConfig,
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return postTokenRequest(body);
}

async function postTokenRequest(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google token request failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

/** Resolve the linked identity (sub + email) from the fresh access token. */
export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Google userinfo failed (${res.status})`);
  }
  return (await res.json()) as GoogleUserInfo;
}

/** Error carrying the HTTP status so callers can branch (401, 403, 429...). */
export class GoogleHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    detail?: unknown
  ) {
    super(`Google API ${status} for ${url}`, { cause: detail });
    this.name = "GoogleHttpError";
  }
}

/** Authed GET against a Google REST endpoint, returning parsed JSON. */
export async function googleFetch<T>(
  url: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => undefined);
    throw new GoogleHttpError(res.status, url, detail);
  }
  return (await res.json()) as T;
}

/**
 * Combine Classroom's split date + time fields into an ISO string, or null.
 * A missing year means "no due date" (e.g. a draft assignment).
 */
export function classroomDateToIso(date?: GoogleDate | null, time?: GoogleTimeOfDay | null): string | null {
  if (!date?.year || !date.month || !date.day) return null;

  // Local-time construction avoids UTC-offset drift for day-based deadlines.
  const hour = time?.hours ?? 0;
  const minute = time?.minutes ?? 0;
  return new Date(date.year, date.month - 1, date.day, hour, minute).toISOString();
}