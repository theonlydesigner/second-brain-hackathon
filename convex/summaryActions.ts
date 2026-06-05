// No "use node" needed — @google/genai uses standard fetch,
// available in the default Convex V8 runtime.
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { Doc } from "./_generated/dataModel";

// ─── Model ───────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.5-flash";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your Convex environment variables " +
        "(Dashboard → Settings → Environment Variables)."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/** Determine if an error is a retryable 429 / 503 response. */
function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE")
  );
}

/**
 * Call Gemini with exponential backoff.
 * Retries up to maxAttempts on 429 / 503; re-throws immediately on other errors.
 *
 * Back-off schedule: 5s → 20s → 60s (jittered ±10%)
 */
async function callWithBackoff(
  fn: () => Promise<string>,
  maxAttempts = 3
): Promise<string> {
  const delays = [5_000, 20_000, 60_000]; // ms between attempts

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts - 1;
      if (isLast || !isRetryable(err)) {
        throw err;
      }

      const base = delays[attempt] ?? 60_000;
      // ±10% jitter to avoid thundering herd
      const jitter = base * 0.1 * (Math.random() * 2 - 1);
      const wait = Math.round(base + jitter);

      console.warn(
        `[summarizeVideo] Gemini attempt ${attempt + 1} failed (retryable). ` +
          `Waiting ${wait}ms before retry. Error: ${
            err instanceof Error ? err.message : String(err)
          }`
      );

      await new Promise((r) => setTimeout(r, wait));
    }
  }

  // TypeScript requires an explicit throw here even though the loop above
  // always either returns or throws.
  throw new Error("Unreachable");
}

/**
 * Single-pass summarization.
 *
 * Concatenates all transcript chunks in chronological order, sends the full
 * text to Gemini 2.5 Flash in one request, and requests structured JSON
 * (summary, keyIdeas, mentalModels, quotes).
 *
 * Gemini 2.5 Flash has a 1 M-token context window.
 * A 60-minute video produces roughly 12k tokens of transcript — well within
 * the limit. This eliminates the N-requests-per-video map-reduce bottleneck
 * that was causing 429 quota exhaustion.
 */
async function generateInsights(
  ai: GoogleGenAI,
  transcriptText: string
): Promise<{
  summary: string;
  keyIdeas: string[];
  mentalModels: { name: string; explanation: string }[];
  quotes: { quote: string; explanation: string }[];
}> {
  const prompt =
    "You are analyzing a YouTube video transcript. " +
    "Generate a structured analysis of this video based only on the transcript provided. " +
    "Do not add information not present in the transcript.\n\n" +
    "Transcript:\n" +
    transcriptText;

  const raw = await callWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description:
                "3-4 sentence overall summary of what the video is about",
            },
            keyIdeas: {
              type: "array",
              items: { type: "string" },
              description: "3-5 key ideas or takeaways from the video",
            },
            mentalModels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  explanation: { type: "string" },
                },
                required: ["name", "explanation"],
              },
              description:
                "Mental models, frameworks, or conceptual tools discussed",
            },
            quotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  quote: { type: "string" },
                  explanation: { type: "string" },
                },
                required: ["quote", "explanation"],
              },
              description: "Notable quotes or statements from the video",
            },
          },
          required: ["summary", "keyIdeas", "mentalModels", "quotes"],
        },
        maxOutputTokens: 2000,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  });

  // Parse and validate — surface a clear error if Gemini returns malformed JSON
  let parsed: {
    summary?: string;
    keyIdeas?: unknown;
    mentalModels?: unknown;
    quotes?: unknown;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error(
      `Gemini returned invalid JSON. Raw response (first 500 chars): ${raw.slice(0, 500)}`
    );
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    keyIdeas: Array.isArray(parsed.keyIdeas)
      ? (parsed.keyIdeas as string[])
      : [],
    mentalModels: Array.isArray(parsed.mentalModels)
      ? (parsed.mentalModels as { name: string; explanation: string }[])
      : [],
    quotes: Array.isArray(parsed.quotes)
      ? (parsed.quotes as { quote: string; explanation: string }[])
      : [],
  };
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export const summarizeVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const ai = getAI(); // throws early if API key missing

    // ── Idempotency guard ────────────────────────────────────────────────────
    // If the video already has a summary (e.g. action was retried after a
    // transient crash before the status was flipped), skip to avoid double
    // billing.
    const video = (await ctx.runQuery(api.videos.getVideoById, {
      videoId: args.videoId,
    })) as Doc<"videos"> | null;

    if (!video) {
      console.error(
        `[summarizeVideo] Video ${args.videoId} not found. Aborting.`
      );
      return;
    }

    if (video.summary) {
      console.log(
        `[summarizeVideo] Video ${args.videoId} already summarized. Skipping.`
      );
      return;
    }

    // ── Fetch all chunks in chronological order ──────────────────────────────
    const chunks = (await ctx.runQuery(
      internal.videos.getChunksForSummarization,
      { videoId: args.videoId }
    )) as Doc<"transcriptChunks">[];

    if (chunks.length === 0) {
      console.error(
        `[summarizeVideo] No transcript chunks found for video ${args.videoId}. Marking failed.`
      );
      await ctx.runMutation(api.videos.updateVideoStatus, {
        videoId: args.videoId,
        status: "failed",
      });
      return;
    }

    // Concatenate chunks in sequence order (already ordered asc by the query)
    const transcriptText = chunks.map((c) => c.text).join("\n\n");

    // ── Single Gemini call with exponential backoff ──────────────────────────
    try {
      const insights = await generateInsights(ai, transcriptText);

      // Atomic: save all insights and flip status to "completed" in one patch
      await ctx.runMutation(internal.videos.saveInsights, {
        videoId: args.videoId,
        summary: insights.summary,
        keyIdeas: insights.keyIdeas,
        mentalModels: insights.mentalModels,
        quotes: insights.quotes,
      });

      console.log(
        `[summarizeVideo] ✓ Video ${args.videoId} summarized in a single pass. ` +
          `Chunks concatenated: ${chunks.length}.`
      );
    } catch (error) {
      // The insight fields are never written on failure — video record stays clean.
      console.error(
        `[summarizeVideo] ✗ Failed for video ${args.videoId} after retries:`,
        error instanceof Error ? error.message : String(error)
      );
      await ctx.runMutation(api.videos.updateVideoStatus, {
        videoId: args.videoId,
        status: "failed",
      });
    }
  },
});
