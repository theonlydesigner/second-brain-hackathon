import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("transcriptChunks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    const text = chunks.map((c) => c.text).join("\n\n");
    return {
      chunksCount: chunks.length,
      chars: text.length,
      tokens: Math.ceil(text.length / 4),
    };
  },
});
