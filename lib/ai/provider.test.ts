// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAI } from "./provider";

const KEYS = ["OPENAI_API_KEY", "AI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "OPENAI_BASE_URL", "AI_MODEL", "OPENAI_MODEL", "ANTHROPIC_MODEL", "GOOGLE_AI_MODEL", "GEMINI_MODEL", "GOOGLE_AI_STRUCTURED_MODEL", "GOOGLE_AI_FALLBACK_MODELS"];

const fetchMock = vi.fn<typeof fetch>();
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  for (const k of KEYS) vi.stubEnv(k, ""); // "" counts as unset; isolates tests from the developer's shell
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("callAI", () => {
  it("returns a configuration error (never fake output) when no provider key is set", async () => {
    const result = await callAI("hi");
    expect(result).toEqual({ error: expect.stringContaining("AI is not configured") });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses OpenAI first, sending the system prompt and bearer key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "ignored");
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "  hello  " } }] }));

    expect(await callAI("prompt", "system")).toEqual({ text: "hello" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init?.body as string).messages).toEqual([
      { role: "system", content: "system" },
      { role: "user", content: "prompt" },
    ]);
    expect(init?.signal).toBeDefined();
  });

  it("falls back to Anthropic, then Gemini", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "ak");
    fetchMock.mockResolvedValue(jsonResponse({ content: [{ text: "from claude" }] }));
    expect(await callAI("p")).toEqual({ text: "from claude" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");

    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gk");
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [{ content: { parts: [{ text: "from gemini" }] } }] }));
    expect(await callAI("p", "sys")).toEqual({ text: "from gemini" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("generativelanguage.googleapis.com");
    expect(JSON.parse(init?.body as string).contents[0].parts[0].text).toBe("sys\n\np");
  });

  it("treats empty env vars as unset (a blank KEY= line must not hide the fallback)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "sk-fallback");
    vi.stubEnv("OPENAI_BASE_URL", "");
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "ok" } }] }));
    expect(await callAI("p")).toEqual({ text: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-fallback");
    expect(JSON.parse(init?.body as string).model).toBe("gpt-4o-mini");
  });

  it("prefers GOOGLE_AI_MODEL, then GEMINI_MODEL, then a live default for Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }));

    vi.stubEnv("GOOGLE_AI_MODEL", "gemini-3.6-flash");
    vi.stubEnv("GEMINI_MODEL", "ignored");
    await callAI("p");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/models/gemini-3.6-flash:generateContent");

    vi.stubEnv("GOOGLE_AI_MODEL", "");
    await callAI("p");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/models/ignored:generateContent");

    vi.stubEnv("GEMINI_MODEL", "");
    await callAI("p");
    const fallback = String(fetchMock.mock.calls[2][0]);
    expect(fallback).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect(fallback).not.toContain("gemini-1.5-flash");
  });

  it("skips Gemini thought parts and returns the first real text part", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    fetchMock.mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: "internal reasoning", thought: true, thoughtSignature: "sig" },
                { text: " the answer" },
              ],
            },
          },
        ],
      })
    );
    expect(await callAI("p")).toEqual({ text: "the answer" });
  });

  it("requests JSON output for Gemini when the caller asks for it", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [{ content: { parts: [{ text: "[]" }] } }] }));

    await callAI("p", "sys", { json: true });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");

    await callAI("p");
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string).generationConfig.responseMimeType).toBeUndefined();
  });

  it("reports provider HTTP errors with status and a truncated body", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockResolvedValue(new Response("x".repeat(900), { status: 429 }));
    const result = await callAI("p");
    expect("error" in result && result.error).toMatch(/^AI provider error \(429\): x{500}$/);
  });

  it("treats an empty reply as an error", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "   " } }] }));
    expect(await callAI("p")).toEqual({ error: "AI returned empty response." });
  });

  it.each(["TimeoutError", "AbortError"])("maps %s to the friendly timeout message", async (name) => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name }));
    expect(await callAI("p")).toEqual({ error: "AI timed out (>15s), try again." });
  });

  it("passes other network errors through", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await callAI("p")).toEqual({ error: "fetch failed" });
  });

  it("never retries a failed request (one provider call per callAI)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await callAI("p");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await callAI("p");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("callAI model chain", () => {
  const geminiOk = (text: string) => jsonResponse({ candidates: [{ content: { parts: [{ text }] } }] });
  const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));

  it("uses the structured model for JSON callers and the prose model otherwise", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "prose-model");
    vi.stubEnv("GOOGLE_AI_STRUCTURED_MODEL", "structured-model");
    fetchMock.mockImplementation(async () => geminiOk("ok"));

    await callAI("p");
    expect(urls()[0]).toContain("/models/prose-model:generateContent");

    await callAI("p", "sys", { json: true });
    expect(urls()[1]).toContain("/models/structured-model:generateContent");
  });

  it("falls back to the prose model when no structured model is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "only-model");
    fetchMock.mockImplementation(async () => geminiOk("ok"));

    await callAI("p", "sys", { json: true });
    expect(urls()[0]).toContain("/models/only-model:generateContent");
  });

  it("appends the fallback models in order and drops blanks", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_STRUCTURED_MODEL", "structured");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", " backup ,, other ");
    // 503 everywhere so the chain is walked to the end and its order is observable.
    fetchMock.mockImplementation(async () => new Response("busy", { status: 503 }));

    await callAI("p", "s", { json: true });
    await callAI("p");
    expect(urls().slice(0, 4)).toEqual([
      expect.stringContaining("/models/structured:generateContent"),
      expect.stringContaining("/models/backup:generateContent"),
      expect.stringContaining("/models/other:generateContent"),
      expect.stringContaining("/models/primary:generateContent"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("never re-tries the active model when it also appears in the fallback list", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "prose-model");
    vi.stubEnv("GOOGLE_AI_STRUCTURED_MODEL", "structured");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "structured,prose-model,backup");
    fetchMock.mockImplementation(async () => new Response("busy", { status: 503 }));

    await callAI("p", "s", { json: true });
    expect(urls()).toEqual([
      expect.stringContaining("/models/structured:generateContent"),
      expect.stringContaining("/models/prose-model:generateContent"),
      expect.stringContaining("/models/backup:generateContent"),
    ]);
  });

  it("defaults to a live free-tier model rather than a retired one", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    fetchMock.mockImplementation(async () => geminiOk("ok"));
    await callAI("p");
    expect(urls()[0]).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect(urls()[0]).not.toContain("gemini-1.5-flash");
  });

  it.each([429, 500, 502, 503, 504, 404])("advances to the next model on %i", async (status) => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "backup");
    fetchMock.mockResolvedValueOnce(new Response("busy", { status })).mockImplementation(async () => geminiOk("from backup"));

    expect(await callAI("p")).toEqual({ text: "from backup" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports the last model's error once the chain is exhausted", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "backup");
    fetchMock.mockImplementation(async () => new Response("no capacity", { status: 503 }));

    const result = await callAI("p");
    expect(result).toEqual({ error: expect.stringContaining("AI provider error (503)") });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403])("does not walk the chain on %i (a different model cannot fix it)", async (status) => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "backup");
    fetchMock.mockImplementation(async () => new Response("denied", { status }));

    const result = await callAI("p");
    expect(result).toEqual({ error: expect.stringContaining(`AI provider error (${status})`) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries the next model when the primary times out", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "backup");
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "TimeoutError" })).mockImplementation(async () => geminiOk("late but fine"));

    expect(await callAI("p")).toEqual({ text: "late but fine" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops walking the chain once the shared time budget is spent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gk");
    vi.stubEnv("GOOGLE_AI_MODEL", "primary");
    vi.stubEnv("GOOGLE_AI_FALLBACK_MODELS", "b1,b2,b3");
    // Each attempt burns past the whole 15s budget, so only the first may be made.
    let clock = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => clock);
    fetchMock.mockImplementation(async () => {
      clock += 16_000;
      return new Response("late", { status: 503 });
    });

    const result = await callAI("p");
    expect("error" in result && result.error).toContain("503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });
});
