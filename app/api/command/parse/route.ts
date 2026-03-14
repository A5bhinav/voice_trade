import { NextRequest, NextResponse } from "next/server";
import { parseCommand } from "@/lib/parser";
import { logCommand } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const { text, source = "chat" } = body as { text: string; source?: string };

  const result = await parseCommand(text);
  logCommand({ text, source, result });

  return NextResponse.json(result);
}
