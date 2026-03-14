import * as fs from "fs";
import { createHmac, createHash } from "crypto";

const env = fs.readFileSync(".env.local", "utf-8");
for (const l of env.split("\n")) { const [k,...v]=l.split("="); if(k&&v.length) process.env[k.trim()]=v.join("=").trim(); }

const key = process.env.LIQUID_API_KEY!;
const secret = process.env.LIQUID_API_SECRET!;

function sign(method: string, path: string, body = "") {
  const ts = Date.now().toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,"0")).join("");
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const msg = [ts, nonce, method, path, "", bodyHash].join("\n");
  const sig = createHmac("sha256", secret).update(msg).digest("hex");
  return { "Content-Type":"application/json","X-Liquid-Key":key,"X-Liquid-Timestamp":ts,"X-Liquid-Nonce":nonce,"X-Liquid-Signature":sig };
}

async function main() {
  const r = await fetch("https://api-public.liquidmax.xyz/v1/markets", { headers: sign("GET", "/v1/markets") });
  const data = await r.json() as { success: boolean; data: { symbol: string; ticker: string; max_leverage: number }[] };
  if (!data.success) { console.log("Failed:", data); return; }
  console.log(`Total markets: ${data.data.length}\n`);
  data.data.forEach(m => console.log(`${m.symbol.padEnd(20)} ticker=${m.ticker.padEnd(8)} max_leverage=${m.max_leverage}x`));
}

main().catch(console.error);
