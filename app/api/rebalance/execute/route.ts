import { NextRequest, NextResponse } from "next/server";
import { consumePendingCommand } from "@/lib/session";
import { liquidClient } from "@/lib/liquid";
import { MutationQueue } from "@/lib/queue";
import { logExecution } from "@/lib/audit";
import type { TradePlan, TradePlanAction, ExecutionReceipt } from "@/lib/types";

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

  let plan: TradePlan;
  try {
    const pending = consumePendingCommand(confirmation_token);
    if (!("intent_summary" in pending)) {
      return NextResponse.json(
        { error: "Use /api/command/execute for single trade commands" },
        { status: 400 }
      );
    }
    plan = pending as TradePlan;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid token" },
      { status: 400 }
    );
  }

  const queue = new MutationQueue();
  const receipts: ExecutionReceipt[] = [];

  const tasks = plan.actions.map((action: TradePlanAction) => async () => {
    const receiptId = crypto.randomUUID();
    const receipt: ExecutionReceipt = {
      id: receiptId,
      type: "rebalance",
      status: "failed",
      liquid_order_ids: [],
      timestamp: new Date().toISOString(),
    };

    try {
      if (action.action === "place_order") {
        if (!action.symbol || !action.side || !action.size_usd) {
          throw new Error(`Action ${action.order_index}: missing symbol/side/size_usd`);
        }
        const order = await liquidClient.placeOrder({
          symbol: action.symbol,
          side: action.side,
          order_type: action.order_type ?? "market",
          size_usd: action.size_usd,
          price: action.price,
          leverage: action.leverage,
        });
        receipt.status = "executed";
        receipt.liquid_order_ids = [String(order.id)];
      } else if (action.action === "close_position") {
        if (!action.symbol) throw new Error(`Action ${action.order_index}: missing symbol`);
        const positions = await liquidClient.getPositions();
        const position = positions.find((p) =>
          p.product_code.toUpperCase().includes((action.symbol ?? "").replace("-PERP", ""))
        );
        if (!position) throw new Error(`No open position for ${action.symbol}`);
        await liquidClient.closePosition(String(position.id));
        receipt.status = "executed";
      } else {
        throw new Error(`Unsupported rebalance action: ${action.action}`);
      }
    } catch (e) {
      receipt.status = "failed";
      receipt.error = e instanceof Error ? e.message : "Action failed";
    }

    logExecution(action, receipt);
    receipts.push(receipt);
    return receipt;
  });

  await queue.runAll(tasks);

  // Determine aggregate status
  const allExecuted = receipts.every((r) => r.status === "executed");
  const anyExecuted = receipts.some((r) => r.status === "executed");
  if (!allExecuted && anyExecuted) {
    receipts.forEach((r) => {
      if (r.status === "executed") r.status = "partial";
    });
  }

  return NextResponse.json(receipts);
}
