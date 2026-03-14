const urls = [
  "https://app.liquid.com",
  "https://trade.liquid.com",
  "https://api.getliquid.io",
  "https://api.tryliquid.io",
  "https://api.useliquid.io",
  "https://liquid.com",
];

async function main() {
  for (const u of urls) {
    try {
      const r = await fetch(`${u}/v1/health`, { signal: AbortSignal.timeout(4000) });
      const text = await r.text();
      console.log(`✓ ${u} → ${r.status} ${text.slice(0, 120)}`);
    } catch (e) {
      console.log(`✗ ${u} → ${(e as Error).message}`);
    }
  }
}

main();
