// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));

const { redirectWithError, verifyOtpAndRedirect } = await import("./authRedirect");

const ORIGIN = "https://app.test";
const location = (res: Response) => res.headers.get("location");

beforeEach(() => verifyOtp.mockReset());

describe("redirectWithError", () => {
  it("adds error and description to the target", () => {
    const url = new URL(location(redirectWithError(ORIGIN, "/reset-password", "auth-callback-failed", "Link expired"))!);
    expect(url.origin + url.pathname).toBe(`${ORIGIN}/reset-password`);
    expect(url.searchParams.get("error")).toBe("auth-callback-failed");
    expect(url.searchParams.get("error_description")).toBe("Link expired");
  });

  it("re-sanitizes next so an off-site target falls back to the dashboard", () => {
    for (const next of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
      const url = new URL(location(redirectWithError(ORIGIN, next, "x"))!);
      expect(url.origin).toBe(ORIGIN);
      expect(url.pathname).toBe("/dashboard");
    }
  });
});

describe("verifyOtpAndRedirect", () => {
  it("redirects to next after a valid OTP", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const res = await verifyOtpAndRedirect(ORIGIN, "/reset-password", "hash", "recovery");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "recovery" });
    expect(location(res)).toBe(`${ORIGIN}/reset-password`);
  });

  it("redirects back with the error when verification fails", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } });
    const url = new URL(location(await verifyOtpAndRedirect(ORIGIN, "/reset-password", "hash", "recovery"))!);
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("error")).toBe("auth-callback-failed");
    expect(url.searchParams.get("error_description")).toBe("Token has expired");
  });

  it("never redirects off-site even with a hostile next", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(location(await verifyOtpAndRedirect(ORIGIN, "//evil.com", "hash", "recovery"))).toBe(`${ORIGIN}/dashboard`);
  });
});
