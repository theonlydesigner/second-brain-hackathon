import { query } from "./_generated/server";

export const getAllMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const getChunks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transcriptChunks").collect();
  },
});
