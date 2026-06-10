import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const trigger = mutation({
  args: {},
  handler: async (ctx) => {
    const videoId = "jd7c2ynr2ggbvc4hkx77442ej5880947" as any;
    await ctx.db.patch(videoId, { status: "queued", summary: undefined as any });
    await ctx.scheduler.runAfter(0, internal.videos.attemptStartNextVideo);
  }
});
