import { NextResponse } from "next/server";
import type { PortfolioSnapshot } from "@/lib/types";

// TODO (Dev A): replace with LiquidClient.getAccount() + getPositions() + getOpenOrders()
export async function GET() {
  const snapshot: PortfolioSnapshot = {
    account: { balance_usd: 0, available_usd: 0 },
    positions: [],
    open_orders: [],
  };
  return NextResponse.json(snapshot);
}
