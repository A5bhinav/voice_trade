import { NextRequest, NextResponse } from "next/server";
import { validateConfirmationToken } from "@/lib/validator";
import { executePanic } from "@/lib/panic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { confirmation_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { confirmation_token } = body;
  if (!confirmation_token) {
    return NextResponse.json({ error: "confirmation_token required" }, { status: 400 });
  }

  try {
    validateConfirmationToken(confirmation_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // executePanic never throws — surfaces partial failures in response
  const result = await executePanic("anon");
  return NextResponse.json(result);
}
