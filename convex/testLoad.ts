import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const runLoadTest = action({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    console.log("Starting load test with 10 concurrent requests...");
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        ctx.runAction(internal.summaryActions.summarizeVideo, {
          videoId: args.videoId,
        })
      );
    }
    
    try {
      await Promise.allSettled(promises);
      console.log("Load test finished");
    } catch (e) {
      console.error("Load test failed", e);
    }
  },
});

export const resetVideo = internalMutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, { status: "ingesting", summary: undefined, keyIdeas: undefined, mentalModels: undefined, quotes: undefined });
  }
});

export const testFallback = action({
  args: {},
  handler: async (ctx) => {
    const ai = new (await import("@google/genai")).GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const { generateWithFallback } = await import("./lib/gemini");
    const response = await generateWithFallback(ai, {
      contents: "Hello",
      config: { maxOutputTokens: 10 }
    });
    console.log("Response text:", response.text);
    return response.text;
  }
});
