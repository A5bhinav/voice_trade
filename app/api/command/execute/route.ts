import { NextRequest, NextResponse } from "next/server";
import { consumePendingCommand } from "@/lib/session";
import { liquidClient } from "@/lib/liquid";
import { logExecution } from "@/lib/audit";
import type { TradeCommand, ExecutionReceipt } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { confirmation_token: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { confirmation_token } = body ?? {};
  if (!confirmation_token) {
    return NextResponse.json({ error: "Missing confirmation_token" }, { status: 400 });
  }

  let command: TradeCommand;
  try {
    const pending = consumePendingCommand(confirmation_token);
    // Panic tokens should not be executed via this route
    if ("intent_summary" in pending) {
      return NextResponse.json({ error: "Use /api/rebalance/execute for trade plans" }, { status: 400 });
    }
    command = pending as TradeCommand;
    if (command.action === "panic") {
      return NextResponse.json({ error: "Use /api/panic/execute for panic actions" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid token" },
      { status: 400 }
    );
  }

  const receiptId = crypto.randomUUID();
  const receipt: ExecutionReceipt = {
    id: receiptId,
    type: "order",
    status: "failed",
    liquid_order_ids: [],
    timestamp: new Date().toISOString(),
  };

  try {
    if (command.action === "place_order") {
      if (!command.symbol || !command.side || !command.size_usd) {
        throw new Error("Missing required fields: symbol, side, size_usd");
      }
      const order = await liquidClient.placeOrder({
        symbol: command.symbol,
        side: command.side,
        order_type: command.order_type ?? "market",
        size_usd: command.size_usd,
        price: command.price,
        leverage: command.leverage,
      });
      receipt.status = "executed";
      receipt.liquid_order_ids = [String(order.id)];
    } else if (command.action === "close_position") {
      if (!command.symbol) throw new Error("Missing symbol for close_position");
      const positions = await liquidClient.getPositions();
      const position = positions.find(
        (p) =>
          p.product_code.toUpperCase().includes((command.symbol ?? "").replace("-PERP", ""))
      );
      if (!position) throw new Error(`No open position found for ${command.symbol}`);
      await liquidClient.closePosition(String(position.id));
      receipt.status = "executed";
    } else if (command.action === "cancel_all_orders") {
      const cancelled = await liquidClient.cancelAllOrders();
      receipt.status = "executed";
      receipt.liquid_order_ids = [`cancelled:${cancelled}`];
    } else {
      throw new Error(`Unsupported action: ${command.action}`);
    }

    logExecution(command, receipt);
    return NextResponse.json(receipt);
  } catch (e) {
    receipt.status = "failed";
    receipt.error = e instanceof Error ? e.message : "Execution failed";
    logExecution(command, receipt);
    return NextResponse.json(receipt, { status: 500 });
  }
}
