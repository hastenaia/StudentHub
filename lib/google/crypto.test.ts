// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

describe("Google token encryption (AES-256-GCM)", () => {
  beforeEach(() => vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "test-key-with-enough-entropy-1234567890"));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips a token", () => {
    const token = "ya29.a0Af-refresh/token+with=special_chars";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("uses a fresh IV per call (same plaintext → different payloads)", () => {
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
    expect(a.split(".")).toHaveLength(3);
    expect(decryptToken(a)).toBe("same");
    expect(decryptToken(b)).toBe("same");
  });

  it("rejects tampered ciphertext instead of returning garbage", () => {
    const [iv, tag, data] = encryptToken("secret-refresh-token").split(".");
    const bytes = Buffer.from(data, "base64");
    bytes[0] ^= 0xff;
    expect(() => decryptToken([iv, tag, bytes.toString("base64")].join("."))).toThrow();
  });

  it("rejects a tampered auth tag", () => {
    const [iv, tag, data] = encryptToken("secret").split(".");
    const t = Buffer.from(tag, "base64");
    t[0] ^= 0xff;
    expect(() => decryptToken([iv, t.toString("base64"), data].join("."))).toThrow();
  });

  it("cannot be decrypted with a different key", () => {
    const payload = encryptToken("secret");
    vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "a-different-key");
    expect(() => decryptToken(payload)).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptToken("not-a-payload")).toThrow("Malformed encrypted token payload");
    expect(() => decryptToken("a.b")).toThrow("Malformed encrypted token payload");
  });

  it("refuses to run without a key", () => {
    vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "");
    expect(() => encryptToken("x")).toThrow("GOOGLE_TOKEN_ENCRYPTION_KEY is not set");
  });
});
