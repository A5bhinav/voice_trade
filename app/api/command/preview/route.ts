import { NextRequest, NextResponse } from "next/server";

// TODO (Dev C): validate TradeCommand against Liquid, build PreviewCard
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Preview not yet implemented" }, { status: 501 });
}
