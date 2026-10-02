import { describe, expect, it, vi } from "vitest";
import { readAiCache, writeAiCache } from "./cache";

type FakeClient = Parameters<typeof readAiCache>[0];

/** Minimal stand-in for the chained Supabase query builders cache.ts uses. */
function fakeClient(result: { data?: unknown; error?: { message: string } | null }) {
  const eq = vi.fn(() => fake);
  const maybeSingle = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn(async () => ({ error: result.error ?? null }));
  const from = vi.fn(() => ({ select, upsert }));
  const fake = { from, select, upsert, eq, maybeSingle } as unknown as FakeClient;
  return { fake, from, select, upsert, eq, maybeSingle };
}

describe("readAiCache", () => {
  it("returns the stored data for a matching key", async () => {
    const { fake, maybeSingle } = fakeClient({ data: { data: { summary: "cell division" } } });
    await expect(readAiCache(fake, "user-1", "key-1")).resolves.toEqual({ summary: "cell division" });
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("returns null when nothing is stored", async () => {
    const { fake } = fakeClient({ data: null });
    await expect(readAiCache(fake, "user-1", "key-1")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the query errors", async () => {
    const { fake } = fakeClient({ error: { message: "relation ai_cache does not exist" } });
    await expect(readAiCache(fake, "user-1", "key-1")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the client explodes", async () => {
    const boom = { from: () => { throw new Error("network down"); } } as unknown as FakeClient;
    await expect(readAiCache(boom, "user-1", "key-1")).resolves.toBeNull();
  });

  it("ignores a stored value that isn't an object", async () => {
    const { fake } = fakeClient({ data: { data: "oops" } });
    await expect(readAiCache(fake, "user-1", "key-1")).resolves.toBeNull();
  });
});

describe("writeAiCache", () => {
  it("upserts on user + key so a regeneration replaces the row", async () => {
    const { fake, upsert, from } = fakeClient({});
    await writeAiCache(fake, "user-1", "key-1", "summarize", "Biology", { summary: "cell division" });
    expect(from).toHaveBeenCalledWith("ai_cache");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", cache_key: "key-1", action: "summarize", label: "Biology", data: { summary: "cell division" } },
      { onConflict: "user_id,cache_key" }
    );
  });

  it("never throws when the write fails", async () => {
    const { fake } = fakeClient({ error: { message: "permission denied" } });
    await expect(writeAiCache(fake, "user-1", "key-1", "quiz", "Quiz", { questions: [] })).resolves.toBeUndefined();
  });

  it("never throws when the client explodes", async () => {
    const boom = { from: () => { throw new Error("network down"); } } as unknown as FakeClient;
    await expect(writeAiCache(boom, "user-1", "key-1", "quiz", "Quiz", {})).resolves.toBeUndefined();
  });
});
