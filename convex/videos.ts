import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getVideos = query({
  args: {},
  handler: async (ctx): Promise<Doc<"videos">[]> => {
    return await ctx.db.query("videos").order("desc").take(100);
  },
});

export const getVideoById = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<Doc<"videos"> | null> => {
    return await ctx.db.get(args.videoId);
  },
});

export const getVideosByFolder = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<Doc<"videos">[]> => {
    return await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .order("desc")
      .collect();
  },
});

export const getUnfolderedVideos = query({
  args: {},
  handler: async (ctx): Promise<Doc<"videos">[]> => {
    return await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", undefined))
      .order("desc")
      .collect();
  },
});


// ─── Mutations ───────────────────────────────────────────────────────────────

export const insertDraftVideo = mutation({
  args: {
    youtubeId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"videos">["_id"]> => {
    // Deduplicate: return existing id if already ingested
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_youtube_id", (q) => q.eq("youtubeId", args.youtubeId))
      .unique();
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("videos", {
      youtubeId: args.youtubeId,
      title: args.title,
      description: args.channelName,
      thumbnailUrl: args.thumbnailUrl,
      duration: "",
      status: "ingesting",
    });
  },
});

export const updateVideoStatus = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.union(
      v.literal("ingesting"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.videoId, { status: args.status });
  },
});

export const insertChunks = mutation({
  args: {
    videoId: v.id("videos"),
    chunks: v.array(
      v.object({
        sequence: v.number(),
        startTime: v.number(),
        endTime: v.number(),
        text: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    for (const chunk of args.chunks) {
      await ctx.db.insert("transcriptChunks", {
        videoId: args.videoId,
        sequence: chunk.sequence,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        text: chunk.text,
      });
    }
  },
});
