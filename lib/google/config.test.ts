import { describe, expect, it } from "vitest";
import {
  GOOGLE_REQUIRED_ENV,
  googleNotConfiguredMessage,
  isGoogleConfigured,
  missingGoogleEnvVars,
} from "./config";

const FULL = {
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/api/google/callback",
  GOOGLE_TOKEN_ENCRYPTION_KEY: "key",
};

describe("missingGoogleEnvVars", () => {
  it("returns empty when everything is set", () => {
    expect(missingGoogleEnvVars(FULL)).toEqual([]);
  });

  it("reports each missing var", () => {
    expect(missingGoogleEnvVars({})).toEqual([...GOOGLE_REQUIRED_ENV]);
    expect(missingGoogleEnvVars({ GOOGLE_CLIENT_ID: "id" })).toEqual([
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REDIRECT_URI",
      "GOOGLE_TOKEN_ENCRYPTION_KEY",
    ]);
  });

  it("treats blank strings as missing", () => {
    expect(
      missingGoogleEnvVars({ ...FULL, GOOGLE_CLIENT_SECRET: "   " })
    ).toEqual(["GOOGLE_CLIENT_SECRET"]);
  });
});

describe("isGoogleConfigured", () => {
  it("is true only when all vars are present", () => {
    expect(isGoogleConfigured(FULL)).toBe(true);
    expect(isGoogleConfigured({})).toBe(false);
    expect(isGoogleConfigured({ ...FULL, GOOGLE_REDIRECT_URI: "" })).toBe(false);
  });
});

describe("googleNotConfiguredMessage", () => {
  it("names the missing vars and points at setup", () => {
    const message = googleNotConfiguredMessage({ GOOGLE_CLIENT_ID: "id" });
    expect(message).toContain("Google Classroom sync is not configured");
    expect(message).toContain("GOOGLE_CLIENT_SECRET");
    expect(message).toContain(".env.local.example");
  });
});
