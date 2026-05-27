/**
 * MiniMax OpenAI-compatible chat API (https://platform.minimax.io/docs/guides/text-generation)
 */
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_API_URL =
  process.env.MINIMAX_API_URL || "https://api.minimax.io/v1/chat/completions";
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

export function isMinimaxConfigured(): boolean {
  return !!MINIMAX_API_KEY;
}

export async function minimaxChat(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string } | null> {
  if (!MINIMAX_API_KEY) return null;

  const res = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 8192,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[minimax]", res.status, errText.slice(0, 300));
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) return null;

  return { content, model: MINIMAX_MODEL };
}
