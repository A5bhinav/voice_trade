import { NextResponse } from "next/server";
import { liquidClient } from "@/lib/liquid";

export async function GET() {
  const health = await liquidClient.getHealth();
  return NextResponse.json({
    ok: true,
    liquid: health.status === "ok",
    timestamp: new Date().toISOString(),
  });
}
