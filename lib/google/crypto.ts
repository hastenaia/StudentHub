import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts/decrypts Google OAuth tokens at rest.
 *
 * Tokens are the most sensitive piece of the integration — with a refresh
 * token an attacker can impersonate the user on Google indefinitely — so they
 * are AES-256-GCM encrypted before being written to Postgres. The
 * GOOGLE_TOKEN_ENCRYPTION_KEY env var never leaves the server and is never
 * exposed to the browser or logged.
 *
 * Payload format: "<iv b64>.<authTag b64>.<ciphertext b64>" so each row is
 * self-describing (random IV per encryption, integrity-checked via GCM tag).
 */

const separator = ".";

/** Derive a stable 32-byte key from the env var (accept any sensible length). */
function getKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not set");
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    separator
  );
}

export function decryptToken(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(separator);

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token payload");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  // Tampered ciphertext fails authentication here and throws — never returns
  // garbage decrypted data.
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}