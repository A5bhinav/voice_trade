import { NextRequest, NextResponse } from "next/server";

// TODO (Dev A): consume confirmation token, execute via LiquidClient, return ExecutionReceipt
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Execute not yet implemented" }, { status: 501 });
}
