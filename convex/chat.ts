import { action, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { generateWithFallback } from "./lib/openrouter";

export const getMessages = query({
  args: { 
    videoId: v.optional(v.id("videos")),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    if (args.videoId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
        .order("asc")
        .take(50);
    } else if (args.folderId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
        .order("asc")
        .take(50);
    }
    return [];
  },
});

export const saveUserMessage = mutation({
  args: { 
    videoId: v.optional(v.id("videos")), 
    folderId: v.optional(v.id("folders")), 
    text: v.string(),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    let mode = args.mode;
    if (!mode) {
      if (args.videoId) {
        const video = await ctx.db.get(args.videoId);
        if (video) mode = video.mode;
      } else if (args.folderId) {
        const folder = await ctx.db.get(args.folderId);
        if (folder) mode = folder.mode;
      }
    }
    return await ctx.db.insert("messages", {
      videoId: args.videoId,
      folderId: args.folderId,
      sender: "user",
      text: args.text,
      createdAt: Date.now(),
      mode: mode ?? "personal",
    });
  },
});

export const saveAssistantMessage = internalMutation({
  args: {
    videoId: v.optional(v.id("videos")),
    folderId: v.optional(v.id("folders")),
    text: v.string(),
    sourceChunkIds: v.array(v.id("transcriptChunks")),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    let mode = args.mode;
    if (!mode) {
      if (args.videoId) {
        const video = await ctx.db.get(args.videoId);
        if (video) mode = video.mode;
      } else if (args.folderId) {
        const folder = await ctx.db.get(args.folderId);
        if (folder) mode = folder.mode;
      }
    }
    return await ctx.db.insert("messages", {
      videoId: args.videoId,
      folderId: args.folderId,
      sender: "assistant",
      text: args.text,
      createdAt: Date.now(),
      sourceChunkIds: args.sourceChunkIds,
      mode: mode ?? "personal",
    });
  },
});

export const getChunksByIds = query({
  args: { chunkIds: v.array(v.id("transcriptChunks")) },
  handler: async (ctx, args): Promise<(Doc<"transcriptChunks"> | null)[]> => {
    return await Promise.all(args.chunkIds.map((id) => ctx.db.get(id)));
  },
});

// ─── Video Chat ──────────────────────────────────────────────────────────────

export const answerQuestion = action({
  args: { videoId: v.id("videos"), question: v.string() },
  handler: async (ctx, args) => {
    // 1. Search top 5 chunks based on question
    const chunks = (await ctx.runQuery(internal.search.searchChunks, {
      videoId: args.videoId,
      question: args.question,
      limit: 5,
    })) as Doc<"transcriptChunks">[];

    // 2. Get recent chat history
    const recentMessages = (await ctx.runQuery(api.chat.getMessages, {
      videoId: args.videoId,
    })) as Doc<"messages">[];
    const history = recentMessages.slice(-6);

    // 3. Construct message array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    
    let systemPrompt = "You are an AI assistant helping users understand a specific video.\n";
    systemPrompt += "Answer the user's question based ONLY on the provided transcript excerpts.\n";
    systemPrompt += "Do not use external knowledge. If the answer is not in the excerpts, say:\n";
    systemPrompt += "\"I couldn't find information about that in this video's transcript.\"\n\n";

    systemPrompt += "--- TRANSCRIPT EXCERPTS ---\n";
    if (chunks.length === 0) {
      systemPrompt += "(No relevant excerpts found for this question)\n\n";
    } else {
      for (const chunk of chunks) {
        systemPrompt += `[Segment ${chunk.sequence}]\n${chunk.text}\n\n`;
      }
    }
    messages.push({ role: "system", content: systemPrompt });

    for (const msg of history) {
      messages.push({ role: msg.sender as "user" | "assistant", content: msg.text });
    }

    messages.push({ 
      role: "user", 
      content: `${args.question}\n\nAnswer concisely and directly. Reference specific segments when relevant.` 
    });

    // 4. Call OpenRouter
    const answerContent = await generateWithFallback(messages, { maxTokens: 2000 });
    let answer = answerContent.trim() || "I couldn't generate an answer.";
    
    // 4b. Safety Guard
    const answerLower = answer.toLowerCase();
    const systemLower = systemPrompt.toLowerCase();
    if ((answerLower.includes("javascript") || answerLower.includes("settimeout") || answerLower.includes("async/await") || answerLower.includes("console.log")) && 
        !systemLower.includes("javascript") && !systemLower.includes("settimeout") && !systemLower.includes("async/await") && !systemLower.includes("console.log")) {
      console.warn(`[chat] WARNING: Unrelated topic shift detected! Raw response: ${answerContent}`);
    }
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

// ─── Folder Chat ─────────────────────────────────────────────────────────────

export const answerFolderQuestion = action({
  args: { folderId: v.id("folders"), question: v.string() },
  handler: async (ctx, args) => {
    // 1. Search across all videos in the folder using fan-out (top 3 chunks per video)
    const chunks = (await ctx.runQuery(internal.search.searchFolderChunks, {
      folderId: args.folderId,
      question: args.question,
      limitPerVideo: 3,
    })) as Doc<"transcriptChunks">[];

    // 2. Get recent folder chat history
    const recentMessages = (await ctx.runQuery(api.chat.getMessages, {
      folderId: args.folderId,
    })) as Doc<"messages">[];
    const history = recentMessages.slice(-6);

    // 3. Construct message array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    
    let systemPrompt = "You are an AI assistant helping users synthesize knowledge across multiple videos in a folder.\n";
    systemPrompt += "Answer the user's question based ONLY on the provided transcript excerpts from various videos.\n";
    systemPrompt += "Do not use external knowledge. If the answer is not in the excerpts, say:\n";
    systemPrompt += "\"I couldn't find information about that across these videos.\"\n\n";

    systemPrompt += "--- TRANSCRIPT EXCERPTS ---\n";
    if (chunks.length === 0) {
      systemPrompt += "(No relevant excerpts found for this question)\n\n";
    } else {
      for (const chunk of chunks) {
        systemPrompt += `[Video ID: ${chunk.videoId} | Segment ${chunk.sequence}]\n${chunk.text}\n\n`;
      }
    }
    messages.push({ role: "system", content: systemPrompt });

    for (const msg of history) {
      messages.push({ role: msg.sender as "user" | "assistant", content: msg.text });
    }

    messages.push({ 
      role: "user", 
      content: `${args.question}\n\nAnswer concisely and directly. Synthesize the insights if multiple videos mention the topic.` 
    });

    // 4. Call OpenRouter
    const answerContent = await generateWithFallback(messages, { maxTokens: 4000 });
    let answer = answerContent.trim() || "I couldn't generate an answer.";
    
    // 4b. Safety Guard
    const answerLower = answer.toLowerCase();
    const systemLower = systemPrompt.toLowerCase();
    if ((answerLower.includes("javascript") || answerLower.includes("settimeout") || answerLower.includes("async/await") || answerLower.includes("console.log")) && 
        !systemLower.includes("javascript") && !systemLower.includes("settimeout") && !systemLower.includes("async/await") && !systemLower.includes("console.log")) {
      console.warn(`[chat] WARNING: Unrelated topic shift detected! Raw response: ${answerContent}`);
    }
    const sourceChunkIds = chunks.map((c) => c._id as Id<"transcriptChunks">);

    // 5. Save assistant message and source chunks
    await ctx.runMutation(internal.chat.saveAssistantMessage, {
      folderId: args.folderId,
      text: answer,
      sourceChunkIds,
    });

    return { text: answer, sourceChunkIds };
  },
});
