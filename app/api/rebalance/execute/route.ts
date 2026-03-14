import { NextRequest, NextResponse } from "next/server";

// TODO (Dev A): consume token, execute TradePlan sequentially via queue, return ExecutionReceipt[]
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Rebalance execute not yet implemented" }, { status: 501 });
}
