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
