import { NextRequest, NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";
import { storePendingCommand } from "@/lib/session";
import { PanicPreview } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { armed } = body as { armed: boolean };

    const liquid = LiquidClient;

    const [openOrders, positions] = await Promise.all([
      liquid.getOpenOrders(),
      liquid.getPositions(),
    ]);

    const openPositions = positions.map((p) => ({
      symbol: p.symbol,
      size: p.size,
    }));

    // 1 mutation per order cancel-all (counts as 1) + 1 per position close
    const estimatedMutations = 1 + openPositions.length;

    // Store a panic command as the pending command
    const confirmation_token = storePendingCommand({
      action: "panic",
      urgency: "panic",
    });

    const preview: PanicPreview = {
      open_orders_count: openOrders.length,
      open_positions: openPositions,
      estimated_mutations: estimatedMutations,
      confirmation_token,
    };

    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Panic preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
