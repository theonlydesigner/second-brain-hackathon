import { GoogleGenAI } from "@google/genai";
import { generateWithFallback, PRIMARY_MODEL, FALLBACK_MODEL } from "../convex/lib/gemini.js";
import fs from "fs";
import path from "path";

// Unset GOOGLE_API_KEY if it exists so SDK uses our specific one
delete process.env.GOOGLE_API_KEY;

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
let apiKey = process.env.GEMINI_API_KEY;
if (fs.existsSync(envPath) && !apiKey) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/GEMINI_API_KEY=(.*)/);
  if (match) {
    apiKey = match[1].trim();
    process.env.GEMINI_API_KEY = apiKey;
  }
}

async function runTest() {
  if (!apiKey) throw new Error("No API key");

  console.log(`[TEST] Primary Model: ${PRIMARY_MODEL}`);
  console.log(`[TEST] Fallback Model: ${FALLBACK_MODEL}`);

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await generateWithFallback(ai, {
      contents: "Hello, this is a test. What is 2+2? Respond very concisely.",
      config: { maxOutputTokens: 50 },
    });
    console.log("\n[TEST] Generation SUCCESS.");
    console.log("[TEST] Actual model used:", response.modelVersion || PRIMARY_MODEL);
    console.log("[TEST] Response text:", response.text);
  } catch (err) {
    console.error("\n[TEST] Generation FAILED:", err);
  }
}

runTest().catch(console.error);
