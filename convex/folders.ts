import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getFolders = query({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Doc<"folders">[]> => {
    const mode = args.mode ?? "personal";
    const all = await ctx.db.query("folders").order("asc").collect();
    return all.filter((f) => (f.mode ?? "personal") === mode);
  },
});

export const getFolderById = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<Doc<"folders"> | null> => {
    return await ctx.db.get(args.folderId);
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createFolder = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"folders">["_id"]> => {
    const name = args.name.trim();
    if (!name) throw new Error("Folder name cannot be empty");
    return await ctx.db.insert("folders", {
      name,
      description: args.description,
      mode: args.mode ?? "personal",
    });
  },
});

export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const name = args.name.trim();
    if (!name) throw new Error("Folder name cannot be empty");
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");
    await ctx.db.patch(args.folderId, { name });
  },
});

export const deleteFolder = mutation({
  args: { folderId: v.id("folders"), mode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Recursively delete all videos, transcripts, and messages inside this folder
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const video of videos) {
      // 1. Delete transcript chunks
      const chunks = await ctx.db
        .query("transcriptChunks")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id);
      }

      // 2. Delete video chat messages
      const videoMessages = await ctx.db
        .query("messages")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const msg of videoMessages) {
        await ctx.db.delete(msg._id);
      }

      // 3. Delete the video itself
      await ctx.db.delete(video._id);
    }

    // Delete folder level messages
    const folderMessages = await ctx.db
      .query("messages")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    for (const msg of folderMessages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.folderId);
  },
});

// ─── Video ↔ Folder assignment ────────────────────────────────────────────────

export const moveVideoToFolder = mutation({
  args: {
    videoId: v.id("videos"),
    folderId: v.optional(v.id("folders")),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const mode = args.mode ?? "personal";
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    if ((video.mode ?? "personal") !== mode) {
      throw new Error("Video does not belong to the active workspace mode");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new Error("Folder not found");
      if ((folder.mode ?? "personal") !== mode) {
        throw new Error("Folder does not belong to the active workspace mode");
      }
    }

    await ctx.db.patch(args.videoId, { folderId: args.folderId });
  },
});
