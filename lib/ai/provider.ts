/**
 * AI Provider abstraction — server-side only.
 * Never expose keys to client. Checks env and returns either a real
 * OpenAI-compatible call or a configuration error.
 */

type AIProvider = "openai" | "anthropic" | "google";

/** Budget for the WHOLE chain, not one request: note-sized prompts on Gemini Flash need seconds. */
const AI_TIMEOUT_MS = 15000;

/** Contention is routine on free tiers (429/503, or 404 when a model is retired), so try the next model. */
const RETRYABLE_STATUS = new Set([404, 429, 500, 502, 503, 504]);

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  /** Tried in order; index 0 is the primary. Providers without a fallback list get exactly one entry. */
  models: string[];
  baseUrl?: string;
}

/** Drops blanks and duplicates while keeping order, so the primary model is never retried against itself. */
function dedupeModels(models: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of models) {
    const name = m?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

function splitFallbacks(raw: string | undefined): string[] {
  return (raw || "").split(",").map((m) => m.trim()).filter(Boolean);
}

function getAIConfig(json: boolean | undefined): { ok: true; config: AIConfig } | { ok: false; error: string } {
  // `||`, not `??`: an empty `KEY=` line in .env.local must count as unset, not hide the fallback.
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (openaiKey) {
    return {
      ok: true,
      config: {
        provider: "openai",
        apiKey: openaiKey,
        models: [process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"],
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      },
    };
  }
  if (anthropicKey) {
    return {
      ok: true,
      config: {
        provider: "anthropic",
        apiKey: anthropicKey,
        models: [process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307"],
      },
    };
  }
  if (googleKey) {
    const proseModel = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL;
    // Free-tier `flash-lite` models are far less contended than `flash`, and the strict-JSON routes
    // need reliable structured output more than they need maximum capability.
    const structuredModel = process.env.GOOGLE_AI_STRUCTURED_MODEL || proseModel;
    const primary = (json ? structuredModel : proseModel) || "gemini-3.5-flash-lite";
    return {
      ok: true,
      config: {
        provider: "google",
        apiKey: googleKey,
        models: dedupeModels([primary, ...splitFallbacks(process.env.GOOGLE_AI_FALLBACK_MODELS)]),
      },
    };
  }
  return {
    ok: false,
    error:
      "AI is not configured. Set one of OPENAI_API_KEY (or AI_API_KEY), ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY (or GEMINI_API_KEY) in .env.local and restart the dev server — env vars are read at startup only. See .env.local.example. No fake responses are returned when unconfigured.",
  };
}

async function withAbort<T>(ms: number, fn: (signal: AbortSignal | undefined) => Promise<T>): Promise<T> {
  // Create the signal before calling `fn`: if `fn`'s error were caught here it would fall through and fire
  // the request a second time (double provider cost on every failure).
  const timeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  let signal: AbortSignal | undefined;
  if (typeof timeout === "function") {
    try {
      signal = timeout.call(AbortSignal, ms);
    } catch {}
  }
  if (signal) return await fn(signal);
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

/** Gemini thinking models can emit reasoning parts before the answer, so take the first non-thought text part. */
function pickGeminiText(data: unknown): string | undefined {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }).candidates?.[0]?.content?.parts;
  return parts?.find((p) => p.text && !p.thought)?.text;
}

/** Each provider only differs in request shape and where the text sits in the reply. */
function buildRequest(config: AIConfig, model: string, prompt: string, systemPrompt?: string, json?: boolean): ProviderRequest {
  switch (config.provider) {
    case "openai":
      return {
        url: `${config.baseUrl}/chat/completions`,
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: {
          model,
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
        body: { model, max_tokens: 1024, messages: [{ role: "user", content: prompt }], system: systemPrompt },
        pick: (d) => (d as { content?: { text?: string }[] }).content?.[0]?.text,
      };
    case "google":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
        headers: {},
        body: {
          contents: [{ parts: [{ text: `${systemPrompt ? `${systemPrompt}\n\n` : ""}${prompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        },
        pick: pickGeminiText,
      };
  }
}

type Attempt = { text: string } | { error: string; retryable: boolean };

export async function callAI(prompt: string, systemPrompt?: string, opts?: { json?: boolean }): Promise<{ text: string } | { error: string }> {
  const cfg = getAIConfig(opts?.json);
  if (!cfg.ok) return { error: cfg.error };

  const { config } = cfg;
  // The budget covers every attempt, so a long chain can never outlive the callers' abort windows.
  const deadline = Date.now() + AI_TIMEOUT_MS;
  let last: Attempt = { error: "AI request failed.", retryable: true };

  for (let i = 0; i < config.models.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const request = buildRequest(config, config.models[i], prompt, systemPrompt, opts?.json);
    let attempt: Attempt = { error: "AI request failed.", retryable: true };
    try {
      attempt = await withAbort(remaining, async (signal) => {
        const res = await fetch(request.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...request.headers },
          body: JSON.stringify(request.body),
          signal,
        });
        if (!res.ok) {
          const txt = await res.text();
          return { error: `AI provider error (${res.status}): ${txt.slice(0, 500)}`, retryable: RETRYABLE_STATUS.has(res.status) };
        }
        const text = request.pick(await res.json())?.trim();
        if (!text) return { error: "AI returned empty response.", retryable: true };
        return { text };
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      attempt = timedOut
        ? { error: `AI timed out (>${AI_TIMEOUT_MS / 1000}s), try again.`, retryable: true }
        : { error: e instanceof Error ? e.message : "AI request failed.", retryable: true };
    }

    if ("text" in attempt) return { text: attempt.text };
    last = attempt;
    // A bad key or a malformed request won't be fixed by a different model; contention might be.
    if (!attempt.retryable) break;
  }

  return { error: last.error };
}
