import { describe, expect, it } from "vitest";
import { AUTO_SYNC_MIN_AGE_MS, shouldAutoSync } from "./autoSync";

const now = Date.parse("2026-09-30T12:00:00.000Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("shouldAutoSync", () => {
  it("skips when no Google account is linked", () => {
    expect(shouldAutoSync(null, now)).toBe(false);
  });

  it("skips when the account needs reconnecting", () => {
    expect(shouldAutoSync({ needs_reconnect: true, last_synced_at: null }, now)).toBe(false);
  });

  it("syncs when never synced", () => {
    expect(shouldAutoSync({ needs_reconnect: false, last_synced_at: null }, now)).toBe(true);
  });

  it("skips a sync that happened within the minimum age", () => {
    expect(shouldAutoSync({ needs_reconnect: false, last_synced_at: ago(AUTO_SYNC_MIN_AGE_MS - 1000) }, now)).toBe(false);
  });

  it("syncs once the last sync is at least the minimum age old", () => {
    expect(shouldAutoSync({ needs_reconnect: false, last_synced_at: ago(AUTO_SYNC_MIN_AGE_MS) }, now)).toBe(true);
    expect(shouldAutoSync({ needs_reconnect: false, last_synced_at: ago(24 * 60 * 60 * 1000) }, now)).toBe(true);
  });

  it("syncs when the stored timestamp is unparseable", () => {
    expect(shouldAutoSync({ needs_reconnect: false, last_synced_at: "not a date" }, now)).toBe(true);
  });
});
