import * as fs from "fs";
import { createHmac } from "crypto";

const envFile = fs.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const BASE = "https://api.getliquid.io";

function authHeaders(method: string, path: string, body = "") {
  const apiKey = process.env.LIQUID_API_KEY!;
  const apiSecret = process.env.LIQUID_API_SECRET!;
  const nonce = Date.now().toString();
  const sig = createHmac("sha256", apiSecret)
    .update(nonce + method.toUpperCase() + path + body)
    .digest("hex");
  return { "Content-Type": "application/json", "X-API-KEY": apiKey, "X-API-NONCE": nonce, "X-API-SIGNATURE": sig };
}

async function probe(method: "GET" | "POST", path: string, auth = false) {
  try {
    const headers = auth ? authHeaders(method, path) : { "Content-Type": "application/json" };
    const r = await fetch(`${BASE}${path}`, { method, headers, signal: AbortSignal.timeout(5000) });
    const t = await r.text();
    let parsed: unknown;
    try { parsed = JSON.parse(t); } catch { parsed = t; }
    const preview = typeof parsed === "string" ? parsed.slice(0, 300) : JSON.stringify(parsed).slice(0, 300);
    console.log(`${method} ${path} → ${r.status}: ${preview}`);
  } catch (e) {
    console.log(`${method} ${path} → ERR: ${(e as Error).message}`);
  }
}

async function main() {
  console.log("=== PUBLIC ===");
  await probe("GET", "/health");
  await probe("GET", "/markets");
  await probe("GET", "/predictions");
  await probe("GET", "/prediction-markets");
  await probe("GET", "/events");
  await probe("GET", "/assets");
  await probe("GET", "/instruments");
  await probe("GET", "/tickers");

  console.log("\n=== AUTHENTICATED ===");
  await probe("GET", "/account", true);
  await probe("GET", "/markets", true);
  await probe("GET", "/predictions", true);
  await probe("GET", "/orders", true);
  await probe("GET", "/positions", true);
}

main();
