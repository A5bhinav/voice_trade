import { NextRequest, NextResponse } from "next/server";

// TODO (Dev A): validate token + armed flag, cancel all orders, close all positions sequentially
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Panic execute not yet implemented" }, { status: 501 });
}
