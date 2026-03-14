import { NextResponse } from "next/server";
import { liquidClient } from "@/lib/liquid";
import type { PortfolioSnapshot } from "@/lib/types";

export async function GET() {
  try {
    const snapshot = await liquidClient.getPortfolioSnapshot();
    return NextResponse.json(snapshot);
  } catch (e) {
    // Return empty snapshot when credentials are missing or API is unreachable
    const empty: PortfolioSnapshot = {
      account: { balance_usd: 0, available_usd: 0 },
      positions: [],
      open_orders: [],
    };
    return NextResponse.json(empty, {
      headers: { "X-Liquid-Error": e instanceof Error ? e.message : "unknown" },
    });
  }
}
