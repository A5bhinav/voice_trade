import { NextRequest, NextResponse } from "next/server";
import { orchestratePanic } from "@/lib/panic";

export async function POST(req: NextRequest) {
  let body: { confirmation_token: string; armed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { confirmation_token } = body ?? {};
  if (!confirmation_token) {
    return NextResponse.json({ error: "Missing confirmation_token" }, { status: 400 });
  }

  try {
    const result = await orchestratePanic(confirmation_token);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Panic execution failed" },
      { status: 500 }
    );
  }
}
