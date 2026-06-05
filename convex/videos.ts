import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

// Internal query used by the summarization action to fetch all chunks
export const getChunksForSummarization = internalQuery({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<Doc<"transcriptChunks">[]> => {
    return await ctx.db
      .query("transcriptChunks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .order("asc")
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
      v.literal("summarizing"),
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

// Called by the map step — saves a single chunk's summary
export const saveChunkSummary = internalMutation({
  args: {
    chunkId: v.id("transcriptChunks"),
    chunkSummary: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.chunkId, { chunkSummary: args.chunkSummary });
  },
});

// Called by the reduce step — atomically saves all insights + flips status to completed
export const saveInsights = internalMutation({
  args: {
    videoId: v.id("videos"),
    summary: v.string(),
    keyIdeas: v.array(v.string()),
    mentalModels: v.array(
      v.object({ name: v.string(), explanation: v.string() })
    ),
    quotes: v.array(
      v.object({ quote: v.string(), explanation: v.string() })
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.videoId, {
      summary: args.summary,
      keyIdeas: args.keyIdeas,
      mentalModels: args.mentalModels,
      quotes: args.quotes,
      status: "completed",
    });
  },
});

// Public mutation — browser fires this to schedule async summarization.
// Uses scheduler so the browser never waits for Gemini.
export const scheduleSummarization = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.scheduler.runAfter(
      0,
      internal.summaryActions.summarizeVideo,
      { videoId: args.videoId }
    );
  },
});
