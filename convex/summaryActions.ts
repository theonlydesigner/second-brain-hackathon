// No "use node" needed
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { generateWithFallback } from "./lib/openrouter";
import { ConvexError } from "convex/values";

/**
 * Single-pass summarization.
 *
 * Concatenates all transcript chunks in chronological order, sends the full
 * text to OpenRouter in one request, and requests structured JSON
 * (summary, keyIdeas, mentalModels, quotes).
 */
async function generateInsights(
  title: string,
  channelName: string,
  transcriptText: string,
  videoId: string
): Promise<{
  summary: string;
  keyIdeas: string[];
  mentalModels: { name: string; explanation: string }[];
  quotes: { quote: string; explanation: string }[];
}> {
  const systemPrompt = "You are a professional video analyst. You analyze YouTube videos using their title, channel name, and transcript to generate highly context-aware, structured insights. You must output ONLY valid JSON.";
  const userPrompt = `You are analyzing a YouTube video. Below is the metadata and transcript of the video.

Metadata:
- Video Title: "${title}"
- Channel Name: "${channelName}"

Transcript:
${transcriptText}

Generate a structured analysis of this video in JSON format. The JSON MUST follow this structure exactly:
{
  "summary": "[Your multi-paragraph summary]",
  "keyIdeas": ["idea 1", "idea 2", "idea 3", ...],
  "mentalModels": [{"name": "Model Name", "explanation": "Model Explanation"}, ...],
  "quotes": [{"quote": "Quote text from transcript", "explanation": "Explanation of the quote's significance"}, ...]
}

CRITICAL SUMMARY REQUIREMENTS:
The "summary" field must be a multi-paragraph text block with the following structure:
1. The FIRST paragraph must explain the context of the video:
   - Identify the content type (e.g., Tutorial, Interview, Podcast, Lecture, Conversation, Listening practice, Documentary, Commentary, etc.).
   - State the intended purpose of the video.
   - Explain why someone would watch it and who it is for.
   - Outline the main topics/themes covered.
   - Do NOT just say "This video is about...". Instead, combine the metadata (Title, Channel) and transcript evidence to explain what the video actually IS.
   Example: "This is a long-form English listening practice video featuring Vanessa and Dan. Through a natural conversation about parenting, education, relationships, and family life, viewers can improve their English comprehension by listening to authentic native English speech."
2. The SUBSEQUENT paragraphs should provide a detailed topic summary, breaking down the specific segments, key discussions, and flow of the video.

Ensure that "keyIdeas", "mentalModels", and "quotes" are also richly populated based on the transcript.`;

  const reqStart = Date.now();
  console.log(`[summarizeVideo:${videoId}] AI request started at ${new Date(reqStart).toISOString()}`);
  
  let raw: string;
  try {
    raw = await generateWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        maxTokens: 8192,
        jsonMode: true,
      }
    );
    const reqEnd = Date.now();
    console.log(`[summarizeVideo:${videoId}] AI request finished at ${new Date(reqEnd).toISOString()} (Duration: ${reqEnd - reqStart}ms)`);
  } catch (e) {
    const reqEnd = Date.now();
    console.log(`[summarizeVideo:${videoId}] AI request failed at ${new Date(reqEnd).toISOString()} (Duration: ${reqEnd - reqStart}ms)`);
    throw e;
  }

  console.log(`[AI] Raw response (first 2000 chars):`, raw.slice(0, 2000));
  console.log(`[AI] Response length:`, raw.length);

  let parsed: any;
  try {
    let cleanRaw = raw.trim();
    if (cleanRaw.startsWith("```json")) cleanRaw = cleanRaw.replace(/^```json\n?/, "");
    if (cleanRaw.startsWith("```")) cleanRaw = cleanRaw.replace(/^```\n?/, "");
    if (cleanRaw.endsWith("```")) cleanRaw = cleanRaw.replace(/\n?```$/, "");
    
    parsed = JSON.parse(cleanRaw);
  } catch (err) {
    console.error("[AI] JSON parse failed:", err);
    console.error("[AI] Raw response:", raw);
    throw err;
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    keyIdeas: Array.isArray(parsed.keyIdeas) ? parsed.keyIdeas : [],
    mentalModels: Array.isArray(parsed.mentalModels) ? parsed.mentalModels : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
  };
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export const summarizeVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const actionStart = Date.now();
    console.log(`[summarizeVideo:${args.videoId}] ACTION STARTED at ${new Date(actionStart).toISOString()}`);
    let failurePhase = "before_ai";

    try {
      const video = (await ctx.runQuery(api.videos.getVideoById, {
        videoId: args.videoId,
      })) as Doc<"videos"> | null;

      if (!video) {
        console.error(`[summarizeVideo:${args.videoId}] Video not found. Aborting.`);
        return;
      }

      console.log(`[summarizeVideo:${args.videoId}] STATUS CHANGE: current status is ${video.status}`);

      if (video.summary) {
        console.log(`[summarizeVideo:${args.videoId}] Already summarized. Skipping.`);
        return;
      }

      const chunks = (await ctx.runQuery(
        internal.videos.getChunksForSummarization,
        { videoId: args.videoId }
      )) as Doc<"transcriptChunks">[];

      if (chunks.length === 0) {
        console.error(`[summarizeVideo:${args.videoId}] No transcript chunks found. Marking failed.`);
        await ctx.runMutation(api.videos.updateVideoStatus, {
          videoId: args.videoId,
          status: "failed",
        });
        return;
      }

      const transcriptText = chunks.map((c) => c.text).join("\n\n");
      const charCount = transcriptText.length;
      const estimatedTokens = Math.ceil(charCount / 4);
      console.log(`[summarizeVideo:${args.videoId}] Transcript stats - chars: ${charCount}, estimated tokens: ${estimatedTokens}`);

      failurePhase = "during_ai";
      const insights = await generateInsights(
        video.title,
        video.description, // stores channelName
        transcriptText,
        args.videoId
      );

      failurePhase = "after_ai";
      await ctx.runMutation(internal.videos.saveInsights, {
        videoId: args.videoId,
        summary: insights.summary,
        keyIdeas: insights.keyIdeas,
        mentalModels: insights.mentalModels,
        quotes: insights.quotes,
      });

      await ctx.runMutation(internal.videos.attemptStartNextVideo);

      const actionEnd = Date.now();
      console.log(`[summarizeVideo:${args.videoId}] STATUS CHANGE: -> completed`);
      console.log(`[summarizeVideo:${args.videoId}] ACTION COMPLETED at ${new Date(actionEnd).toISOString()} (Total runtime: ${actionEnd - actionStart}ms)`);
      
    } catch (error) {
      const actionEnd = Date.now();
      const stack = error instanceof Error ? error.stack : String(error);
      console.error(
        `[summarizeVideo:${args.videoId}] ✗ Failed/Aborted.\nFailure phase: ${failurePhase}\nTotal action runtime: ${actionEnd - actionStart}ms\nExact stack: ${stack}`
      );
      
      if (error instanceof ConvexError && (error.data as any)?.code === "AI_UNAVAILABLE") {
        console.log(`[summarizeVideo:${args.videoId}] STATUS CHANGE: -> queued (AI_UNAVAILABLE)`);
        await ctx.runMutation(api.videos.updateVideoStatus, {
          videoId: args.videoId,
          status: "queued",
        });
        // Try again in 30 seconds
        await ctx.scheduler.runAfter(30_000, internal.videos.attemptStartNextVideo);
      } else {
        console.log(`[summarizeVideo:${args.videoId}] STATUS CHANGE: -> failed`);
        await ctx.runMutation(api.videos.updateVideoStatus, {
          videoId: args.videoId,
          status: "failed",
          errorMessage: String(error),
        });
        // Advance queue since we failed
        await ctx.runMutation(internal.videos.attemptStartNextVideo);
      }
    }
  },
});
