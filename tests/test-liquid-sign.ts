import * as fs from "fs";
import { createHmac, createHash } from "crypto";

const env = fs.readFileSync(".env.local", "utf-8");
for (const l of env.split("\n")) {
  const [k, ...v] = l.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

const key = process.env.LIQUID_API_KEY!;
const secret = process.env.LIQUID_API_SECRET!;

async function test(fullPath: string, signPath: string) {
  const ts = Date.now().toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
  const bodyHash = createHash("sha256").update("").digest("hex");
  const msg = [ts, nonce, "GET", signPath, "", bodyHash].join("\n");
  const sig = createHmac("sha256", secret).update(msg).digest("hex");
  const r = await fetch(`https://api-public.liquidmax.xyz${fullPath}`, {
    headers: { "Content-Type": "application/json", "X-Liquid-Key": key, "X-Liquid-Timestamp": ts, "X-Liquid-Nonce": nonce, "X-Liquid-Signature": sig }
  });
  const data = await r.json() as { success: boolean; error?: { message: string }; data?: unknown };
  console.log(`fetch=${fullPath} sign=${signPath} ->`, data.success ? `OK: ${JSON.stringify(data.data).slice(0,100)}` : `FAIL: ${data.error?.message}`);
}

async function main() {
  // Try different combinations of fetch path and signing path
  await test("/v1/markets", "/v1/markets");
  await test("/v1/markets", "/markets");
  await test("/v1/account", "/v1/account");
  await test("/v1/account", "/account");
}

main().catch(console.error);
