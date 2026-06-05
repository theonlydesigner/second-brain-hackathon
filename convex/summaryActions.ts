// No "use node" needed — @google/genai uses standard fetch, which is available
// in the default Convex V8 runtime.
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { Doc, Id } from "./_generated/dataModel";

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

/**
 * Summarize one transcript chunk into 2-3 sentences.
 * Thinking disabled for cost efficiency on the map step.
 */
async function summarizeChunk(ai: GoogleGenAI, text: string): Promise<string> {
  const prompt =
    "Summarize the following transcript segment in 2-3 sentences. " +
    "Focus on the main point being discussed. Be concise and factual. " +
    "Do not add information not present in the transcript.\n\n" +
    "Transcript:\n" +
    text;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: 300,
    },
  });

  const result = response.text?.trim();
  if (!result) throw new Error("Empty response from Gemini on map step");
  return result;
}

/**
 * Synthesize all chunk summaries into structured video insights.
 * Returns a parsed object; throws if Gemini response is not valid JSON.
 */
async function synthesizeInsights(
  ai: GoogleGenAI,
  chunkSummaries: string[]
): Promise<{
  summary: string;
  keyIdeas: string[];
  mentalModels: { name: string; explanation: string }[];
  quotes: { quote: string; explanation: string }[];
}> {
  const prompt =
    "The following are sequential summaries of segments from a YouTube video. " +
    "Generate a structured analysis of the full video based only on these summaries.\n\n" +
    "Segment summaries:\n" +
    chunkSummaries.join("\n\n---\n\n");

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
            description: "3-4 sentence overall summary of the video",
          },
          keyIdeas: {
            type: "array",
            items: { type: "string" },
            description: "3-5 key ideas from the video",
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
            description: "Mental models or frameworks discussed",
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

  const raw = response.text?.trim();
  if (!raw) throw new Error("Empty response from Gemini on reduce step");

  const parsed = JSON.parse(raw) as {
    summary: string;
    keyIdeas: string[];
    mentalModels: { name: string; explanation: string }[];
    quotes: { quote: string; explanation: string }[];
  };

  return {
    summary: parsed.summary ?? "",
    keyIdeas: Array.isArray(parsed.keyIdeas) ? parsed.keyIdeas : [],
    mentalModels: Array.isArray(parsed.mentalModels) ? parsed.mentalModels : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
  };
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export const summarizeVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const ai = getAI(); // throws early if API key missing

    // ── Idempotency guard ──────────────────────────────────────────────────
    // If the video already has a summary (e.g. action was retried after
    // a transient crash), skip to avoid duplicate Gemini calls.
    const video = (await ctx.runQuery(api.videos.getVideoById, {
      videoId: args.videoId,
    })) as Doc<"videos"> | null;

    if (!video) {
      console.error(`[summarizeVideo] Video ${args.videoId} not found. Aborting.`);
      return;
    }

    if (video.summary) {
      console.log(`[summarizeVideo] Video ${args.videoId} already summarized. Skipping.`);
      return;
    }

    // ── Set status → summarizing ───────────────────────────────────────────
    await ctx.runMutation(api.videos.updateVideoStatus, {
      videoId: args.videoId,
      status: "summarizing",
    });

    try {
      // ── Fetch all chunks ─────────────────────────────────────────────────
      const chunks = (await ctx.runQuery(
        internal.videos.getChunksForSummarization,
        { videoId: args.videoId }
      )) as Doc<"transcriptChunks">[];

      if (chunks.length === 0) {
        throw new Error("No transcript chunks found for this video");
      }

      // ── MAP: summarize each chunk (skip already-summarized) ───────────────
      let successCount = 0;

      for (const chunk of chunks) {
        // Idempotency: skip chunks that already have a summary
        if (chunk.chunkSummary) {
          successCount++;
          continue;
        }

        let chunkSummary: string | null = null;

        // One retry on failure
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            chunkSummary = await summarizeChunk(ai, chunk.text);
            break;
          } catch (err) {
            console.warn(
              `[summarizeVideo] Chunk ${chunk.sequence} attempt ${attempt + 1} failed:`,
              err instanceof Error ? err.message : String(err)
            );
          }
        }

        if (chunkSummary) {
          await ctx.runMutation(internal.videos.saveChunkSummary, {
            chunkId: chunk._id as Id<"transcriptChunks">,
            chunkSummary,
          });
          successCount++;
        } else {
          console.error(
            `[summarizeVideo] Chunk ${chunk.sequence} permanently failed — skipping.`
          );
        }
      }

      // ── Guard: at least one chunk must have succeeded ─────────────────────
      if (successCount === 0) {
        throw new Error("All chunk summarizations failed — no summaries available for synthesis");
      }

      // ── Re-fetch chunks to get saved summaries ────────────────────────────
      const updatedChunks = (await ctx.runQuery(
        internal.videos.getChunksForSummarization,
        { videoId: args.videoId }
      )) as Doc<"transcriptChunks">[];

      const chunkSummaries = updatedChunks
        .filter((c) => Boolean(c.chunkSummary))
        .map((c) => c.chunkSummary as string);

      // ── REDUCE: synthesize all chunk summaries → video insights ───────────
      const insights = await synthesizeInsights(ai, chunkSummaries);

      // ── Save insights (atomic — single patch, sets status: "completed") ───
      await ctx.runMutation(internal.videos.saveInsights, {
        videoId: args.videoId,
        summary: insights.summary,
        keyIdeas: insights.keyIdeas,
        mentalModels: insights.mentalModels,
        quotes: insights.quotes,
      });

      console.log(
        `[summarizeVideo] ✓ Video ${args.videoId} summarized. ` +
        `Chunks: ${chunks.length}, succeeded: ${successCount}.`
      );
    } catch (error) {
      // Failure: preserve chunk summaries written so far, mark video failed.
      // The insight fields are NOT touched — video record remains clean.
      console.error(
        `[summarizeVideo] ✗ Failed for video ${args.videoId}:`,
        error instanceof Error ? error.message : String(error)
      );
      await ctx.runMutation(api.videos.updateVideoStatus, {
        videoId: args.videoId,
        status: "failed",
      });
    }
  },
});
