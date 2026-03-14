import OpenAI from "openai";
import type { TradePlan, PortfolioSnapshot } from "./types";
import { MAX_ORDER_USD, MIN_ORDER_USD, SUPPORTED_SYMBOLS } from "./constants";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PLANNER_SYSTEM_PROMPT = `You are a portfolio rebalance planner. Given current positions and a target allocation, generate a TradePlan JSON.

Rules:
- Output ONLY valid TradePlan JSON. No explanation, no markdown.
- size_usd values must be USD notional.
- Always set user_confirmation_required: true.
- Compute estimated_total_mutations from actions array length.
- Never include market timing predictions.
- Each action must have order_index starting from 0.
- Only use supported symbols: BTC-PERP, ETH-PERP, SOL-PERP
- Individual order sizes must be between ${MIN_ORDER_USD} and ${MAX_ORDER_USD} USD.
- If the rebalance requires more than the max order size, split into multiple orders.
- Keep preconditions as a simple string array of checks to verify before execution.

TradePlan schema:
{
  "intent_summary": string,
  "preconditions": string[],
  "actions": [
    {
      "order_index": number,
      "action": "place_order" | "close_position",
      "symbol": "BTC-PERP" | "ETH-PERP" | "SOL-PERP",
      "side": "buy" | "sell",
      "order_type": "market",
      "size_usd": number,
      "note": string  (optional, human-readable explanation)
    }
  ],
  "user_confirmation_required": true,
  "estimated_total_mutations": number
}`;

export async function generateRebalancePlan(
  userIntent: string,
  portfolio: PortfolioSnapshot
): Promise<TradePlan> {
  const portfolioSummary = {
    balance_usd: portfolio.account.balance_usd,
    available_usd: portfolio.account.available_usd,
    positions: portfolio.positions.map((p) => ({
      symbol: p.symbol,
      side: p.side,
      size: p.size,
      value_usd: p.size * p.mark_price,
    })),
  };

  let content: string | null = null;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Current portfolio:\n${JSON.stringify(portfolioSummary, null, 2)}\n\nUser intent: ${userIntent}`,
        },
      ],
      temperature: 0,
    });
    content = response.choices[0]?.message?.content ?? null;
  } catch (e) {
    throw new Error(`Planner unavailable: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  if (!content) throw new Error("No response from planner");

  const plan = JSON.parse(content) as TradePlan;
  if (!plan.intent_summary || !Array.isArray(plan.actions)) {
    throw new Error("Invalid plan structure from LLM");
  }

  // Normalize: ensure user_confirmation_required is true
  plan.user_confirmation_required = true;
  plan.estimated_total_mutations = plan.actions.length;

  return plan;
}
