import { action } from "./_generated/server";
import { v } from "convex/values";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

export const fetchTest = action({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(args.videoId);
      return { success: true, count: segments.length };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});
