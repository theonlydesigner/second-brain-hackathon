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
async function main() {
  const messages: any = await client.query("debug:getAllMessages" as any, {});
  const vidMessages = messages.filter((m: any) => m.videoId === "jd74qydasx8yte9rk3ngx8jarh88cs0c");
  console.log(`Found ${vidMessages.length} messages for video.`);
  for (const msg of vidMessages) {
    console.log(`\n--- SENDER: ${msg.sender} ---`);
    console.log(msg.text);
  }
}
main().catch(console.error);
