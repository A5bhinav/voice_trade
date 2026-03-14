import * as fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const BASE = process.env.LIQUID_API_URL || "https://api.liquid.com";

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function main() {
  const endpoints = [
    "/v1/markets",
    "/v1/predictions",
    "/v1/prediction-markets",
    "/v1/events",
    "/v1/health",
  ];

  for (const ep of endpoints) {
    const result = await get(ep);
    console.log(`\n=== ${ep} (${result.status}) ===`);
    if (typeof result.data === "object") {
      const str = JSON.stringify(result.data, null, 2);
      console.log(str.slice(0, 1000) + (str.length > 1000 ? "\n...(truncated)" : ""));
    } else {
      console.log(String(result.data).slice(0, 500));
    }
  }
}

main();
