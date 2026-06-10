import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  folders: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    mode: v.optional(v.string()),
  }),

  videos: defineTable({
    youtubeId: v.string(),
    title: v.string(),
    description: v.string(),    // stores channel name for now
    thumbnailUrl: v.string(),
    duration: v.string(),
    folderId: v.optional(v.id("folders")),
    status: v.union(
      v.literal("ingesting"),
      v.literal("queued"),
      v.literal("summarizing"),
      v.literal("completed"),
      v.literal("failed")
    ),


    // Populated by Gemini (Day 2+)
    summary: v.optional(v.string()),
    keyIdeas: v.optional(v.array(v.string())),
    mentalModels: v.optional(
      v.array(v.object({ name: v.string(), explanation: v.string() }))
    ),
    quotes: v.optional(
      v.array(v.object({ quote: v.string(), explanation: v.string() }))
    ),
    mode: v.optional(v.string()),
  })
    .index("by_folder", ["folderId"])
    .index("by_youtube_id", ["youtubeId"])
    .index("by_status", ["status"]),

  transcriptChunks: defineTable({
    videoId: v.id("videos"),
    sequence: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    text: v.string(),
    chunkSummary: v.optional(v.string()),
  })
    .index("by_video", ["videoId", "sequence"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["videoId"],
    }),

  messages: defineTable({
    videoId: v.optional(v.id("videos")),
    folderId: v.optional(v.id("folders")),
    sender: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    createdAt: v.number(),
    sourceChunkIds: v.optional(v.array(v.id("transcriptChunks"))),
    mode: v.optional(v.string()),
  })
    .index("by_video", ["videoId"])
    .index("by_folder", ["folderId"]),
});
