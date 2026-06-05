import { isMinimaxConfigured, minimaxChat } from "./minimax";
import { isOpenRouterConfigured, openRouterChat, getTailorModels } from "./openrouter";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

export async function chatWithFallback(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  models?: string[];
}): Promise<{ content: string; model: string } | null> {
  if (isOpenRouterConfigured()) {
    const or = await openRouterChat(params);
    if (or?.content) return or;
  }

  if (GEMINI_KEY) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${params.system}\n\n${params.user}` }] }],
            generationConfig: {
              temperature: params.temperature ?? 0.4,
              maxOutputTokens: params.maxTokens ?? 4096,
            },
          }),
        }
      );
      if (geminiRes.ok) {
        const gemData = await geminiRes.json();
        const content =
          gemData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (content) return { content, model: "gemini-2.0-flash" };
      }
    } catch (err) {
      console.error("[llm] Gemini fallback failed:", err);
    }
  }

  if (isMinimaxConfigured()) {
    const mm = await minimaxChat(params);
    if (mm?.content) return mm;
  }

  return null;
}

/** LLM-first path for tailoring — uses OpenRouter fast models (LLM_MODEL chain). */
export async function chatForTailor(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string } | null> {
  return chatWithFallback({ ...params, models: getTailorModels() });
}
