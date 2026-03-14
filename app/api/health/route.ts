import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, liquid: false, timestamp: new Date().toISOString() });
}
