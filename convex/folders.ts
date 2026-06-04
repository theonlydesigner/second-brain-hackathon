import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getFolders = query({
  args: {},
  handler: async (ctx): Promise<Doc<"folders">[]> => {
    return await ctx.db.query("folders").order("asc").collect();
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
  },
  handler: async (ctx, args): Promise<Doc<"folders">["_id"]> => {
    const name = args.name.trim();
    if (!name) throw new Error("Folder name cannot be empty");
    return await ctx.db.insert("folders", {
      name,
      description: args.description,
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
  args: { folderId: v.id("folders") },
  handler: async (ctx, args): Promise<void> => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Unassign all videos in this folder before deleting
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const video of videos) {
      await ctx.db.patch(video._id, { folderId: undefined });
    }

    await ctx.db.delete(args.folderId);
  },
});

// ─── Video ↔ Folder assignment ────────────────────────────────────────────────

export const assignVideoToFolder = mutation({
  args: {
    videoId: v.id("videos"),
    folderId: v.id("folders"),
  },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");
    await ctx.db.patch(args.videoId, { folderId: args.folderId });
  },
});

export const removeVideoFromFolder = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await ctx.db.patch(args.videoId, { folderId: undefined });
  },
});
