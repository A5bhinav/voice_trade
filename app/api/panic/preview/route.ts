import { NextRequest, NextResponse } from "next/server";
import { liquidClient } from "@/lib/liquid";
import { storePendingCommand } from "@/lib/session";
import type { PanicPreview, TradeCommand } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    // Fetch current state
    const [openOrders, positions] = await Promise.all([
      liquidClient.getOpenOrders().catch(() => []),
      liquidClient.getPositions().catch(() => []),
    ]);

    // Store a panic authorization token
    const panicCommand: TradeCommand = { action: "panic", urgency: "panic" };
    const confirmation_token = storePendingCommand(panicCommand);

    const preview: PanicPreview = {
      open_orders_count: openOrders.length,
      open_positions: positions.map((p) => ({
        symbol: p.product_code,
        size: parseFloat(p.quantity) || 0,
      })),
      estimated_mutations: openOrders.length + positions.length,
      confirmation_token,
    };

    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Panic preview failed" },
      { status: 500 }
    );
  }
}
