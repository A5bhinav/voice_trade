import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";

export async function GET() {
  try {
    const markets = await LiquidClient.getMarkets();
    const assetsToTrack = ["BTC-PERP", "ETH-PERP", "SOL-PERP"];
    const filtered = markets.filter(m => assetsToTrack.includes(m.symbol));
    
    // Fetch tickers in parallel
    const tickers = await Promise.all(
      filtered.map(async (m) => {
        try {
          const t = await LiquidClient.getTicker(m.symbol);
          return { symbol: m.symbol, price: t.last_price };
        } catch {
          return { symbol: m.symbol, price: null };
        }
      })
    );
    
    return NextResponse.json(tickers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
