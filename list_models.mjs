import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Read from .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
let apiKey = process.env.GEMINI_API_KEY;
if (fs.existsSync(envPath) && !apiKey) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/GEMINI_API_KEY=(.*)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

async function run() {
  if (!apiKey) throw new Error("No API key");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.list();
  
  const models = [];
  for await (const model of response) {
    models.push(model.name);
  }
  
  console.log("Found models containing flash/lite/pro:");
  models
    .filter(m => m.includes("flash") || m.includes("lite") || m.includes("pro"))
    .forEach(m => console.log(m));
}
run().catch(console.error);
