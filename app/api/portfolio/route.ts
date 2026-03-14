import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";
import type { PortfolioSnapshot } from "@/lib/types";

export async function GET(): Promise<NextResponse<PortfolioSnapshot & { offline?: boolean; offlineReason?: string } | { error: string }>> {
  try {
    const snapshot = await LiquidClient.getPortfolioSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[portfolio] Liquid API error:", msg);

    // Return a placeholder portfolio with 200 so the UI doesn't break
    const offline: PortfolioSnapshot & { offline: boolean; offlineReason: string } = {
      offline: true,
      offlineReason: msg,
      account: { balance_usd: 0, available_usd: 0 },
      positions: [],
      open_orders: [],
    };
    return NextResponse.json(offline);
  }
}
