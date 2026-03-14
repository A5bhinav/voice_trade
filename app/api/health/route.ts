import { NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";

export async function GET(): Promise<NextResponse> {
  const { ok } = await LiquidClient.getHealth();
  return NextResponse.json({
    ok,
    liquid: ok,
    timestamp: new Date().toISOString(),
  });
}
