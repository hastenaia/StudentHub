/**
 * AI Provider abstraction — server-side only.
 * Never expose keys to client. Checks env and returns either a real
 * OpenAI-compatible call or a configuration error.
 */

type AIProvider = "openai" | "anthropic" | "google";

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getAIConfig(): { ok: true; config: AIConfig } | { ok: false; error: string } {
  // Prefer explicit AI_API_KEY, fall back to common provider keys
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (openaiKey) {
    return {
      ok: true,
      config: {
        provider: "openai",
        apiKey: openaiKey,
        model: process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      },
    };
  }
  if (anthropicKey) {
    return {
      ok: true,
      config: {
        provider: "anthropic",
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-haiku-20240307",
      },
    };
  }
  if (googleKey) {
    return {
      ok: true,
      config: {
        provider: "google",
        apiKey: googleKey,
        model: process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-flash",
      },
    };
  }
  return {
    ok: false,
    error:
      "AI is not configured. Set OPENAI_API_KEY (or AI_API_KEY) in .env.local. See .env.local.example. No fake responses are returned when unconfigured.",
  };
}

async function withAbort<T>(ms: number, fn: (signal: AbortSignal | undefined) => Promise<T>): Promise<T> {
  try {
    const withTimeout = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal };
    if (typeof withTimeout.timeout === "function") return await fn(withTimeout.timeout(ms));
  } catch {}
  let ctrl: AbortController | undefined;
  try {
    ctrl = new AbortController();
  } catch {
    return await fn(undefined);
  }
  const t = setTimeout(() => ctrl?.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

type ProviderRequest = { url: string; headers: Record<string, string>; body: unknown; pick: (data: unknown) => string | undefined };

/** Each provider only differs in request shape and where the text sits in the reply. */
function buildRequest(config: AIConfig, prompt: string, systemPrompt?: string): ProviderRequest {
  switch (config.provider) {
    case "openai":
      return {
        url: `${config.baseUrl}/chat/completions`,
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: {
          model: config.model,
          messages: [...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), { role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        },
        pick: (d) => (d as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content,
      };
    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: { model: config.model, max_tokens: 1024, messages: [{ role: "user", content: prompt }], system: systemPrompt },
        pick: (d) => (d as { content?: { text?: string }[] }).content?.[0]?.text,
      };
    case "google":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
        headers: {},
        body: {
          contents: [{ parts: [{ text: `${systemPrompt ? `${systemPrompt}\n\n` : ""}${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        },
        pick: (d) => (d as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text,
      };
  }
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<{ text: string } | { error: string }> {
  const cfg = getAIConfig();
  if (!cfg.ok) return { error: cfg.error };

  const { config } = cfg;

  const request = buildRequest(config, prompt, systemPrompt);

  try {
    return await withAbort(4500, async (signal) => {
      const res = await fetch(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...request.headers },
        body: JSON.stringify(request.body),
        signal,
      });
      if (!res.ok) {
        const txt = await res.text();
        return { error: `AI provider error (${res.status}): ${txt.slice(0, 500)}` };
      }
      const text = request.pick(await res.json())?.trim();
      if (!text) return { error: "AI returned empty response." };
      return { text };
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return { error: "AI timed out (>4.5s), try again." };
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}
