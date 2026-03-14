import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";

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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
