// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAI } from "./provider";

const KEYS = ["OPENAI_API_KEY", "AI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "OPENAI_BASE_URL", "AI_MODEL", "OPENAI_MODEL"];

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
    expect(await callAI("p")).toEqual({ error: "AI timed out (>4.5s), try again." });
  });

  it("passes other network errors through", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await callAI("p")).toEqual({ error: "fetch failed" });
  });
});
