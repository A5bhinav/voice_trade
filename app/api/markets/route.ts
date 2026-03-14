import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";

const FALLBACK = [
  { symbol: "BTC-PERP", price: null, offline: true },
  { symbol: "ETH-PERP", price: null, offline: true },
  { symbol: "SOL-PERP", price: null, offline: true },
];

export async function GET() {
  try {
    const markets = await LiquidClient.getMarkets();

    // Fetch tickers in parallel for all markets
    const tickers = await Promise.all(
      markets.map(async (m) => {
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
    console.error("[markets] Liquid API error:", msg);
    // Return fallback data with 200 so the UI renders (not 500)
    return NextResponse.json(FALLBACK);
  }
}
