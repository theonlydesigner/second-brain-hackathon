import { ConvexError } from "convex/values";

export const MODELS = [
  "deepseek/deepseek-chat-v3-0324",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-maverick"
];

const MAX_RETRIES_PER_MODEL = 2;
const DELAYS = [1000, 2000];

export async function generateWithFallback(
  messages: { role: string; content: string }[],
  options?: {
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to your Convex environment variables.");
  }

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        if (attempt === 0) {
          console.log(`[AI] Using model: ${model}`);
        } else {
          console.log(`[AI] Retry attempt ${attempt} for model ${model}`);
        }

        const body: any = {
          model,
          messages,
        };

        if (options?.maxTokens) {
          body.max_tokens = options.maxTokens;
        }

        if (options?.jsonMode) {
          body.response_format = { type: "json_object" };
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/second-brain",
            "X-Title": "Second Brain",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`OpenRouter error (${response.status}): ${text}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const finishReason = data.choices?.[0]?.finish_reason;
        const outputTokens = data.usage?.completion_tokens;

        if (attempt === 0) {
          console.log(`[AI] Exact message array sent to OpenRouter:`);
          console.log(JSON.stringify(messages, null, 2));
        }

        console.log(`[AI] Model selected: ${model}`);
        console.log(`[AI] Finish reason: ${finishReason}`);
        console.log(`[AI] Output length (tokens): ${outputTokens}`);
        
        if (!content) {
          throw new Error("Empty content in OpenRouter response");
        }

        return content;
      } catch (err) {
        console.warn(`[AI] Error with ${model} on attempt ${attempt}:`, err);
        if (attempt < MAX_RETRIES_PER_MODEL) {
          // Fallback delay
          await new Promise((r) => setTimeout(r, DELAYS[attempt]));
        }
      }
    }
    
    // If we reach here, this model failed all retries
    if (model !== MODELS[MODELS.length - 1]) {
      const nextModel = MODELS[MODELS.indexOf(model) + 1];
      console.log(`[AI] Falling back to ${nextModel}`);
    }
  }

  console.error("[AI] All providers failed");
  throw new ConvexError({ code: "AI_UNAVAILABLE" });
}
