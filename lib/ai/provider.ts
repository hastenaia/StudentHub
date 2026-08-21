/**
 * AI Provider abstraction — server-side only.
 * Never expose keys to client. Checks env and returns either a real
 * OpenAI-compatible call or a configuration error.
 */

export type AIProvider = "openai" | "anthropic" | "google";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export function getAIConfig(): { ok: true; config: AIConfig } | { ok: false; error: string } {
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

export async function callAI(prompt: string, systemPrompt?: string): Promise<{ text: string } | { error: string }> {
  const cfg = getAIConfig();
  if (!cfg.ok) return { error: cfg.error };

  const { config } = cfg;

  try {
    if (config.provider === "openai") {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { error: `AI provider error (${res.status}): ${txt.slice(0, 500)}` };
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) return { error: "AI returned empty response." };
      return { text };
    }

    if (config.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
          system: systemPrompt,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { error: `AI provider error (${res.status}): ${txt.slice(0, 500)}` };
      }
      const data = (await res.json()) as { content?: { text?: string }[] };
      const text = data.content?.[0]?.text?.trim();
      if (!text) return { error: "AI returned empty response." };
      return { text };
    }

    // Google Gemini
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + "\n\n" : ""}${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      return { error: `AI provider error (${res.status}): ${txt.slice(0, 500)}` };
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { error: "AI returned empty response." };
    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}
