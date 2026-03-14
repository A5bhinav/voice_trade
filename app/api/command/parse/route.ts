import { NextRequest, NextResponse } from "next/server";

// TODO (Dev C): implement LLM parsing via parser.ts
export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  // Stub: return a clarification until Dev C wires LLM
  return NextResponse.json({ clarification_needed: `Parsing not yet implemented. You said: "${text}"` });
}
