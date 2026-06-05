import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { extractYoutubeVideoId, fetchYoutubeMetadata, chunkTranscriptSegments } from "../lib/youtube";
import { Id } from "./_generated/dataModel";

export const ingestVideo = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<Id<"videos">> => {
    // 1. Parse the URL into a video ID
    const youtubeId = extractYoutubeVideoId(args.url);
    if (!youtubeId) {
      throw new Error("Invalid YouTube URL");
    }

    // 2. Fetch metadata via oEmbed (not blocked by YouTube)
    const metadata = await fetchYoutubeMetadata(youtubeId);

    // 3. Create a draft record immediately so the UI shows "ingesting" state
    const videoId: Id<"videos"> = await ctx.runMutation(api.videos.insertDraftVideo, {
      youtubeId,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnailUrl,
      channelName: metadata.author,
    });

    try {
      // 4. Call the Next.js Route Handler for transcript extraction.
      //    This runs in Next.js's server process — NOT in Convex's blocked datacenter IPs.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        throw new Error(
          "NEXT_PUBLIC_APP_URL is not set. Add it to your Convex environment variables."
        );
      }

      const transcriptRes = await fetch(`${appUrl}/api/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: youtubeId }),
      });

      if (!transcriptRes.ok) {
        const errBody = await transcriptRes.text();
        throw new Error(
          `Transcript fetch failed (HTTP ${transcriptRes.status}): ${errBody}`
        );
      }

      const { segments } = (await transcriptRes.json()) as {
        segments: { text: string; offset: number; duration: number }[];
      };

      if (!segments || segments.length === 0) {
        throw new Error("No transcript segments returned");
      }

      // 5. Chunk segments into 5-minute windows with 30-second overlap
      const chunks = chunkTranscriptSegments(segments);

      // 6. Persist chunks to Convex
      await ctx.runMutation(api.videos.insertChunks, { videoId, chunks });

      // 7. Transition to summarizing and schedule Gemini processing.
      //    "completed" is only set inside saveInsights after the reduce step succeeds.
      await ctx.runMutation(api.videos.updateVideoStatus, {
        videoId,
        status: "summarizing",
      });
      await ctx.runMutation(api.videos.scheduleSummarization, { videoId });

      return videoId;
    } catch (error) {
      console.error("[ingestVideo] Failed:", error);
      await ctx.runMutation(api.videos.updateVideoStatus, {
        videoId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
