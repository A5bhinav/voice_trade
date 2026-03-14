async function main() {
  const BASE = "https://api-testnet.gte.xyz/v1";
  const types = ["perps", "clob-spot", "amm", "bonding-curve"];

  for (const t of types) {
    try {
      const r = await fetch(`${BASE}/markets?marketType=${t}&limit=10`);
      const data = await r.json() as Record<string, unknown>;
      const markets = (data.markets ?? data.data ?? (Array.isArray(data) ? data : [])) as unknown[];
      console.log(`\n[${t}] → ${r.status}, ${markets.length} markets`);
      markets.slice(0, 5).forEach((m: unknown) => {
        const market = m as { name?: string; address?: string; baseToken?: { symbol?: string } };
        console.log(`  ${market.name ?? market.baseToken?.symbol ?? "?"} — ${market.address}`);
      });
    } catch (e) {
      console.log(`[${t}] ERR: ${(e as Error).message}`);
    }
  }
}

main();
