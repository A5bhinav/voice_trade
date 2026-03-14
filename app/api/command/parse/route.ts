import { NextRequest, NextResponse } from "next/server";
import { parseCommand } from "@/lib/parser";
import { logCommand } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source } = body as { text: string; source: "chat" | "voice" };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const result = await parseCommand(text.trim());

    await logCommand({
      type: "parse",
      source: source ?? "chat",
      raw_text: text,
      parsed: result,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
