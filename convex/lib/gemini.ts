import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { ConvexError } from "convex/values";

// Temporarily set to nonexistent-model for testing as requested
export const PRIMARY_MODEL = "gemini-2.5-flash";
export const FALLBACK_MODEL = "gemini-2.0-flash";

/** Determine if an error is a quota exhaustion (429) or service unavailable (503). */
function isExhaustedOrTest(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE")
  );
}

export async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">
): Promise<GenerateContentResponse> {
  console.log(`[Gemini] Using model: ${PRIMARY_MODEL}`);

  try {
    return await ai.models.generateContent({
      ...params,
      model: PRIMARY_MODEL,
    });
  } catch (error) {
    if (isExhaustedOrTest(error)) {
      console.warn(`[Gemini] 2.5 Flash quota exhausted. Falling back to ${FALLBACK_MODEL}`);
      
      try {
        return await ai.models.generateContent({
          ...params,
          model: FALLBACK_MODEL,
        });
      } catch (fallbackError) {
        console.error("Fallback error details:", fallbackError);
        if (isExhaustedOrTest(fallbackError)) {
          throw new ConvexError({
            code: "GEMINI_QUOTA_EXHAUSTED"
          });
        }
        throw fallbackError;
      }
    }

    throw error;
  }
}
