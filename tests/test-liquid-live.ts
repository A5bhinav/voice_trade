import * as fs from "fs";
import { createHmac, createHash } from "crypto";

const envFile = fs.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const BASE = "https://api-public.liquidmax.xyz/v1";
const apiKey = process.env.LIQUID_API_KEY!;
const apiSecret = process.env.LIQUID_API_SECRET!;

function sign(method: string, path: string, body = "") {
  const timestamp = Date.now().toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const [canonicalPath, queryString = ""] = path.split("?");
  const canonicalQuery = queryString
    ? queryString.split("&").sort().join("&")
    : "";

  const bodyHash = createHash("sha256").update(body).digest("hex");
  const message = [timestamp, nonce, method.toUpperCase(), canonicalPath, canonicalQuery, bodyHash].join("\n");
  const signature = createHmac("sha256", apiSecret).update(message).digest("hex");

  console.log("  msg:", JSON.stringify(message));

  return {
    "Content-Type": "application/json",
    "X-Liquid-Key": apiKey,
    "X-Liquid-Timestamp": timestamp,
    "X-Liquid-Nonce": nonce,
    "X-Liquid-Signature": signature,
  };
}

async function get(path: string) {
  console.log(`\nGET ${path}`);
  const r = await fetch(`${BASE}${path}`, { headers: sign("GET", path) });
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2).slice(0, 600));
  return data;
}

async function main() {
  console.log("Key:", apiKey?.slice(0, 15) + "...");
  console.log("Secret:", apiSecret?.slice(0, 15) + "...");
  await get("/markets");
  await get("/account");
  await get("/account/positions");
}

main().catch(console.error);
