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
// We will trigger a generic action we create just for this test, or we can just run the openrouter helper locally here.
