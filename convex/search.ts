import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const searchChunks = internalQuery({
  args: {
    videoId: v.id("videos"),
    question: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<Doc<"transcriptChunks">[]> => {
    return await ctx.db
      .query("transcriptChunks")
      .withSearchIndex("search_text", (q) =>
        q.search("text", args.question).eq("videoId", args.videoId)
      )
      .take(args.limit);
  },
});

export const searchFolderChunks = internalQuery({
  args: {
    folderId: v.id("folders"),
    question: v.string(),
    limitPerVideo: v.number(),
  },
  handler: async (ctx, args): Promise<Doc<"transcriptChunks">[]> => {
    // 1. Get all videos in this folder
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    if (videos.length === 0) return [];

    // 2. Fan-out search: Get top chunks for EACH video
    const searchPromises = videos.map((video) =>
      ctx.db
        .query("transcriptChunks")
        .withSearchIndex("search_text", (q) =>
          q.search("text", args.question).eq("videoId", video._id)
        )
        .take(args.limitPerVideo)
    );

    const results = await Promise.all(searchPromises);

    // 3. Flatten the arrays
    return results.flat();
  },
});
