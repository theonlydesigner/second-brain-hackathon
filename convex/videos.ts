import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getVideos = query({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Doc<"videos">[]> => {
    const mode = args.mode ?? "personal";
    const all = await ctx.db.query("videos").order("desc").collect();
    return all.filter((v) => (v.mode ?? "personal") === mode).slice(0, 100);
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
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Doc<"videos">[]> => {
    const mode = args.mode ?? "personal";
    const all = await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", undefined))
      .order("desc")
      .collect();
    return all.filter((v) => (v.mode ?? "personal") === mode);
  },
});

/**
 * Fetches transcript chunks for a video in chronological order.
 *
 * Used by the single-pass summarization action (summaryActions.ts).
 *
 * @deprecated-field chunkSummary — the chunkSummary field on each returned
 * document is no longer written by the summarization pipeline (removed in the
 * Day 3 → single-pass refactor). The field remains in the schema for backward
 * compatibility with existing rows. Schedule removal after Day 5 once the
 * embedding pipeline (which may read chunks) is confirmed not to need it.
 */
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
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"videos">["_id"]> => {
    const mode = args.mode ?? "personal";
    // Deduplicate: return existing id if already ingested in this mode
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_youtube_id", (q) => q.eq("youtubeId", args.youtubeId))
      .collect();
    const match = existing.find((v) => (v.mode ?? "personal") === mode);
    if (match) {
      return match._id;
    }

    return await ctx.db.insert("videos", {
      youtubeId: args.youtubeId,
      title: args.title,
      description: args.channelName,
      thumbnailUrl: args.thumbnailUrl,
      duration: "",
      status: "ingesting",
      mode,
    });
  },
});

export const updateVideoStatus = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.union(
      v.literal("ingesting"),
      v.literal("queued"),
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

// NOTE: saveChunkSummary has been removed. The map-reduce pipeline that
// called it was replaced by single-pass summarization in summaryActions.ts.
// The chunkSummary field in the schema is kept for backward compatibility
// with existing rows and will be removed after Day 5.

/**
 * Atomically saves all AI insights and flips status to "completed".
 * This is the only mutation in the codebase that sets status: "completed".
 */
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

/**
 * Background consumer that pulls the next video off the queue
 * if concurrency limit (< 2) is met.
 */
export const attemptStartNextVideo = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    // 1. Check current concurrency limit
    const summarizingVideos = await ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("status", "summarizing"))
      .collect();

    if (summarizingVideos.length >= 2) {
      return;
    }

    // 2. Fetch oldest queued video
    const nextVideo = await ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();

    if (nextVideo) {
      // 3. Mark summarizing and schedule action
      await ctx.db.patch(nextVideo._id, { status: "summarizing" });
      await ctx.scheduler.runAfter(
        0,
        internal.summaryActions.summarizeVideo,
        { videoId: nextVideo._id }
      );
    }
  },
});

/**
 * Public mutation — browser fires this to trigger the queue processing.
 */
export const scheduleSummarization = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    // Trigger the queue processor. It will pick up the next queued video.
    await ctx.scheduler.runAfter(0, internal.videos.attemptStartNextVideo);
  },
});

export const deleteVideo = mutation({
  args: { videoId: v.id("videos"), mode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    // 1. Delete transcript chunks
    const chunks = await ctx.db
      .query("transcriptChunks")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // 2. Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 3. Delete the video itself
    await ctx.db.delete(args.videoId);
  },
});
