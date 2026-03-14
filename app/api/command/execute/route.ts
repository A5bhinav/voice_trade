import { NextRequest, NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";
import { validateConfirmationToken } from "@/lib/validator";
import { logExecution, logError } from "@/lib/audit";
import type { ExecutionReceipt, TradeCommand } from "@/lib/types";

function isTradePlan(cmd: unknown): cmd is { actions: TradeCommand[] } {
  return typeof cmd === "object" && cmd !== null && Array.isArray((cmd as { actions?: unknown }).actions);
}

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

  let command: TradeCommand;
  try {
    const resolved = validateConfirmationToken(confirmation_token);
    if (isTradePlan(resolved)) {
      return NextResponse.json(
        { error: "Use /api/rebalance/execute for TradePlan tokens" },
        { status: 400 }
      );
    }
    command = resolved as TradeCommand;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const receiptId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    let orderId: string | null = null;

    if (command.action === "place_order") {
      if (!command.symbol || !command.side || !command.order_type || !command.size_usd) {
        return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
      }
      const order = await LiquidClient.placeOrder({
        symbol: command.symbol,
        side: command.side,
        order_type: command.order_type,
        size_usd: command.size_usd,
        price: command.price,
        leverage: command.leverage,
        tp: command.tp,
        sl: command.sl,
        reduce_only: command.reduce_only,
      });
      orderId = order.id;
    } else if (command.action === "close_position") {
      if (!command.symbol) {
        return NextResponse.json({ error: "symbol required for close_position" }, { status: 400 });
      }
      const order = await LiquidClient.closePosition(command.symbol);
      orderId = order.id;
    } else if (command.action === "cancel_all_orders") {
      await LiquidClient.cancelAllOrders();
    } else {
      return NextResponse.json(
        { error: `Action "${command.action}" not supported via this route` },
        { status: 400 }
      );
    }

    const receipt: ExecutionReceipt = {
      id: receiptId,
      type: "order",
      status: "executed",
      liquid_order_ids: orderId ? [orderId] : [],
      timestamp,
    };

    logExecution({ command }, "anon", receipt);
    return NextResponse.json(receipt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError({ command, error: msg });
    const receipt: ExecutionReceipt = {
      id: receiptId,
      type: "order",
      status: "failed",
      liquid_order_ids: [],
      error: msg,
      timestamp,
    };
    return NextResponse.json(receipt, { status: 500 });
  }
}
