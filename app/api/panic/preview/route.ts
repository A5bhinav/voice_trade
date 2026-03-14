import { NextRequest, NextResponse } from "next/server";

// TODO (Dev C): fetch open orders + positions, generate PanicPreview with confirmation token
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Panic preview not yet implemented" }, { status: 501 });
}
