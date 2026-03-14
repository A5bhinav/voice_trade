import { NextRequest, NextResponse } from "next/server";

// TODO (Dev C): generate TradePlan + PreviewCard via planner.ts
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Rebalance preview not yet implemented" }, { status: 501 });
}
