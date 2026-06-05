import { action, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { Doc, Id } from "./_generated/dataModel";

const MODEL = "gemini-2.5-flash";

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your Convex environment variables."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export const getMessages = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    return await ctx.db
      .query("messages")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .order("asc")
      .take(50);
  },
});

export const saveUserMessage = mutation({
  args: { videoId: v.id("videos"), text: v.string() },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    return await ctx.db.insert("messages", {
      videoId: args.videoId,
      sender: "user",
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const saveAssistantMessage = internalMutation({
  args: {
    videoId: v.id("videos"),
    text: v.string(),
    sourceChunkIds: v.array(v.id("transcriptChunks")),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    return await ctx.db.insert("messages", {
      videoId: args.videoId,
      sender: "assistant",
      text: args.text,
      createdAt: Date.now(),
      sourceChunkIds: args.sourceChunkIds,
    });
  },
});

export const getChunksByIds = query({
  args: { chunkIds: v.array(v.id("transcriptChunks")) },
  handler: async (ctx, args): Promise<(Doc<"transcriptChunks"> | null)[]> => {
    return await Promise.all(args.chunkIds.map((id) => ctx.db.get(id)));
  },
});

export const answerQuestion = action({
  args: { videoId: v.id("videos"), question: v.string() },
  handler: async (ctx, args) => {
    const ai = getAI();

    // 1. Search top 5 chunks based on question
    const chunks = (await ctx.runQuery(internal.search.searchChunks, {
      videoId: args.videoId,
      question: args.question,
      limit: 5,
    })) as Doc<"transcriptChunks">[];

    // 2. Get recent chat history (last 6 messages)
    const recentMessages = (await ctx.runQuery(api.chat.getMessages, {
      videoId: args.videoId,
    })) as Doc<"messages">[];
    const history = recentMessages.slice(-6);

    // 3. Construct prompt
    let prompt = "You are an AI assistant helping users understand a specific video.\n";
    prompt += "Answer the user's question based ONLY on the provided transcript excerpts.\n";
    prompt += "Do not use external knowledge. If the answer is not in the excerpts, say:\n";
    prompt += "\"I couldn't find information about that in this video's transcript.\"\n\n";

    prompt += "--- TRANSCRIPT EXCERPTS ---\n";
    if (chunks.length === 0) {
      prompt += "(No relevant excerpts found for this question)\n\n";
    } else {
      for (const chunk of chunks) {
        prompt += `[Segment ${chunk.sequence}]\n${chunk.text}\n\n`;
      }
    }

    if (history.length > 0) {
      prompt += "--- CONVERSATION HISTORY ---\n";
      for (const msg of history) {
        prompt += `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}\n`;
      }
      prompt += "\n";
    }

    prompt += "--- CURRENT QUESTION ---\n";
    prompt += `User: ${args.question}\n\n`;
    prompt += "Answer concisely and directly. Reference specific segments when relevant.";

    // 4. Call Gemini
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
      },
    });

    const answer = response.text?.trim() || "I couldn't generate an answer.";
    const sourceChunkIds = chunks.map((c) => c._id as Id<"transcriptChunks">);

    // 5. Save assistant message and source chunks
    await ctx.runMutation(internal.chat.saveAssistantMessage, {
      videoId: args.videoId,
      text: answer,
      sourceChunkIds,
    });

    return { text: answer, sourceChunkIds };
  },
});
