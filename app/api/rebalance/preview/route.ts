import { NextRequest, NextResponse } from "next/server";
import { LiquidClient } from "@/lib/liquid";
import { generateRebalancePlan } from "@/lib/planner";
import { validateSymbol, validateOrderSize, validateLeverage } from "@/lib/validator";
import { storePendingCommand } from "@/lib/session";
import { SUPPORTED_SYMBOLS } from "@/lib/constants";
import { PreviewCard, TradePlan } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const liquid = LiquidClient;

    // Fetch current state
    const [account, positions] = await Promise.all([
      liquid.getAccount(),
      liquid.getPositions(),
    ]);

    // Fetch tickers for supported symbols
    const tickers: Record<string, number> = {};
    await Promise.all(
      SUPPORTED_SYMBOLS.map(async (symbol) => {
        try {
          const ticker = await liquid.getTicker(symbol);
          tickers[symbol] = ticker.mark_price;
        } catch {
          // skip if ticker unavailable
        }
      })
    );

    const plan = await generateRebalancePlan({
      balance_usd: account.balance_usd,
      available_usd: account.available_usd,
      positions,
      tickers,
    }, text.trim());

    // Validate each action in the plan
    const warnings: string[] = [];
    for (const action of plan.actions) {
      try {
        if (action.symbol) validateSymbol(action.symbol);
        if (action.size_usd !== undefined) validateOrderSize(action.size_usd);
        if (action.leverage !== undefined) validateLeverage(action.leverage);
      } catch (err) {
        warnings.push(
          `Action ${action.order_index}: ${err instanceof Error ? err.message : "validation failed"}`
        );
      }
    }

    const confirmation_token = storePendingCommand(plan);

    const actionLines = plan.actions.map(
      (a) =>
        `${a.order_index + 1}. ${a.side?.toUpperCase() ?? ""} $${a.size_usd} of ${a.symbol ?? ""}${a.note ? ` — ${a.note}` : ""}`
    );

    const preview: PreviewCard = {
      type: "rebalance",
      summary: plan.intent_summary,
      details: {
        "Total Trades": plan.actions.length,
        "Estimated Mutations": plan.estimated_total_mutations,
        Plan: actionLines.join(" | "),
      },
      confirmation_token,
      warnings: [
        ...warnings,
        ...(plan.preconditions.length > 0
          ? [`Preconditions: ${plan.preconditions.join("; ")}`]
          : []),
      ],
    };

    return NextResponse.json({ plan, preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rebalance preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
