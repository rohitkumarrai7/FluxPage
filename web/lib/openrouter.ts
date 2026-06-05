const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const API_URL =
  process.env.LLM_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const WEB_REFERER =
  process.env.NEXT_PUBLIC_WEB_URL || "https://www.fluxpage.com";

export function isOpenRouterConfigured(): boolean {
  return !!OPENROUTER_KEY;
}

/** Fast OpenRouter models — mini first (benchmarked faster), nano second. */
export function getOpenRouterModels(): string[] {
  const primary = process.env.LLM_MODEL || "openai/gpt-5.4-mini";
  return [...new Set([primary, "openai/gpt-5.4-mini", "openai/gpt-5.4-nano"].filter(Boolean))];
}

/** Tailor + JD parsing — same fast OpenRouter chain as general LLM (no Claude required). */
export function getTailorModels(): string[] {
  return getOpenRouterModels();
}

export async function openRouterChat(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  models?: string[];
}): Promise<{ content: string; model: string } | null> {
  if (!OPENROUTER_KEY) return null;

  const models = params.models || getOpenRouterModels();

  for (const model of models) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": WEB_REFERER,
          "X-Title": "Fluxpage",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          temperature: params.temperature ?? 0.4,
          max_tokens: params.maxTokens ?? 4096,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[openrouter]", model, res.status, errText.slice(0, 200));
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      if (content) return { content, model };
    } catch (err) {
      console.error("[openrouter]", model, err);
    }
  }

  return null;
}
