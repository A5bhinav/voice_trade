import { NextRequest, NextResponse } from "next/server";
import { validateConfirmationToken } from "@/lib/validator";
import { LiquidClient } from "@/lib/liquid";
import { runSequential } from "@/lib/queue";
import { logExecution, logError } from "@/lib/audit";
import type { TradePlan, TradePlanAction, ExecutionReceipt } from "@/lib/types";

function isTradePlan(cmd: unknown): cmd is TradePlan {
  return (
    typeof cmd === "object" &&
    cmd !== null &&
    Array.isArray((cmd as TradePlan).actions) &&
    (cmd as TradePlan).user_confirmation_required === true
  );
}

async function executeAction(action: TradePlanAction): Promise<string> {
  if (action.action === "place_order") {
    if (!action.symbol || !action.side || !action.order_type || !action.size_usd) {
      throw new Error(`Action ${action.order_index}: missing required fields`);
    }
    const order = await LiquidClient.placeOrder({
      symbol: action.symbol,
      side: action.side,
      order_type: action.order_type,
      size_usd: action.size_usd,
      price: action.price,
      leverage: action.leverage,
      reduce_only: action.reduce_only,
    });
    return order.id;
  } else if (action.action === "close_position") {
    if (!action.symbol) throw new Error(`Action ${action.order_index}: symbol required`);
    const order = await LiquidClient.closePosition(action.symbol);
    return order.id;
  } else {
    throw new Error(`Unsupported rebalance action: ${action.action}`);
  }
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

  let plan: TradePlan;
  try {
    const resolved = validateConfirmationToken(confirmation_token);
    if (!isTradePlan(resolved)) {
      return NextResponse.json(
        { error: "Token does not reference a TradePlan" },
        { status: 400 }
      );
    }
    plan = resolved;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tasks = plan.actions.map(
    (action) => () => executeAction(action)
  );

  const queueResults = await runSequential(tasks);
  const timestamp = new Date().toISOString();

  const receipts: ExecutionReceipt[] = queueResults.map((r, i) => ({
    id: crypto.randomUUID(),
    type: "rebalance" as const,
    status: r.ok ? ("executed" as const) : ("failed" as const),
    liquid_order_ids: r.value ? [r.value] : [],
    error: r.error,
    timestamp,
  }));

  const overallStatus = receipts.every((r) => r.status === "executed")
    ? "executed"
    : receipts.some((r) => r.status === "executed")
    ? "partial"
    : "failed";

  logExecution({ plan, overallStatus }, "anon", receipts);

  if (overallStatus === "failed") {
    return NextResponse.json(receipts, { status: 500 });
  }
  return NextResponse.json(receipts);
}
