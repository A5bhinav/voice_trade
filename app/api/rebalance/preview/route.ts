import { NextRequest, NextResponse } from "next/server";
import { liquidClient } from "@/lib/liquid";
import { generateRebalancePlan } from "@/lib/planner";
import { validateSymbol, validateOrderSize } from "@/lib/validator";
import { storePendingCommand } from "@/lib/session";
import type { PortfolioSnapshot } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { text: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { text } = body ?? {};
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    // Get current portfolio state for context
    let portfolio: PortfolioSnapshot;
    try {
      portfolio = await liquidClient.getPortfolioSnapshot();
    } catch {
      portfolio = {
        account: { balance_usd: 0, available_usd: 0 },
        positions: [],
        open_orders: [],
      };
    }

    // Generate the rebalance plan
    const plan = await generateRebalancePlan(text, portfolio);

    // Validate each action in the plan (best-effort; surface warnings rather than failing)
    const validationWarnings: string[] = [];
    for (const action of plan.actions) {
      try {
        if (action.symbol) validateSymbol(action.symbol);
        if (action.size_usd) validateOrderSize(action.size_usd);
      } catch (e) {
        validationWarnings.push(
          `Action ${action.order_index}: ${e instanceof Error ? e.message : "validation error"}`
        );
      }
    }

    // Store the full plan in session
    const confirmation_token = storePendingCommand(plan);

    return NextResponse.json({
      plan,
      confirmation_token,
      warnings: validationWarnings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rebalance preview failed" },
      { status: 500 }
    );
  }
}
