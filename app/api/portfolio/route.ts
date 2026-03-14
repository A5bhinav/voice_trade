import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";
import type { PortfolioSnapshot } from "@/lib/types";

export async function GET(): Promise<NextResponse<PortfolioSnapshot | { error: string }>> {
  try {
    const snapshot = await LiquidClient.getPortfolioSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
