import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "fs";

// Manually load .env.local
const envFile = dotenv.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const key = process.env.ANTHROPIC_API_KEY;
console.log("Key loaded:", key ? `${key.slice(0, 20)}...${key.slice(-6)}` : "MISSING");

const anthropic = new Anthropic({ apiKey: key || "" });

async function main() {
  console.log("\nSending test message to Anthropic...");
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [{ role: "user", content: "Reply with just: API key works" }],
    });
    console.log("SUCCESS:", (res.content[0] as { text: string }).text);
  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : err);
  }
}

main();
