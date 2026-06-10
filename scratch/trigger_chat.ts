import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
let url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (fs.existsSync(envPath) && !url) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/NEXT_PUBLIC_CONVEX_URL=(.*)/);
  if (match) {
    url = match[1].trim();
  }
}

const client = new ConvexHttpClient(url!);
client.action("chat:answerQuestion" as any, { videoId: "jd77b2hqtfp4rkqd8xjfq5xdax882vzv", question: "What is this video about?" })
  .then((res: any) => console.log("Success! Exact response:", res))
  .catch(console.error);
