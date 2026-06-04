import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const getChunksForVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<Doc<"transcriptChunks">[]> => {
    return await ctx.db
      .query("transcriptChunks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .order("asc")
      .collect();
  },
});
