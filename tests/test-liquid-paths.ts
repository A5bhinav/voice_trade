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

async function probe(path: string, auth = false) {
  try {
    const headers = auth ? authHeaders("GET", path) : { "Content-Type": "application/json" };
    const r = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(5000) });
    const t = await r.text();
    let parsed: unknown;
    try { parsed = JSON.parse(t); } catch { parsed = t; }
    const preview = typeof parsed === "string" ? parsed.slice(0, 200) : JSON.stringify(parsed).slice(0, 400);
    if (r.status !== 404) console.log(`✓ ${path} → ${r.status}: ${preview}`);
    else console.log(`✗ ${path} → 404`);
  } catch (e) {
    console.log(`✗ ${path} → ERR: ${(e as Error).message}`);
  }
}

async function main() {
  const paths = [
    "/api/v1/markets", "/api/markets", "/api/health",
    "/v2/markets", "/v2/account",
    "/v1/account/info", "/v1/user/account",
    "/v1/exchange/markets", "/v1/trading/markets",
    "/trading/markets", "/trading/account",
    "/v1/perp/markets", "/v1/spot/markets",
    "/v1/account", "/v1/account/balances",
    "/v1/orders", "/v1/positions",
    "/v1/markets/BTC-PERP/ticker",
    "/v1/markets/BTC-PERP",
  ];

  console.log("--- PUBLIC ---");
  for (const p of paths) await probe(p);

  console.log("\n--- AUTH ---");
  for (const p of ["/v1/account", "/v1/orders", "/v1/positions", "/v1/account/balances"]) {
    await probe(p, true);
  }
}

main();
