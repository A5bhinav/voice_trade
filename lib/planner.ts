import OpenAI from "openai";
import { TradePlan, TradePlanAction } from "./types";
import { SUPPORTED_SYMBOLS } from "./constants";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PLANNER_SYSTEM_PROMPT = `You are a portfolio rebalance planner. Given current positions and a target allocation, generate a TradePlan JSON.

Rules:
- Output ONLY valid TradePlan JSON via the trade_plan function.
- size_usd values must be USD notional.
- Always set user_confirmation_required: true.
- Compute estimated_total_mutations from actions array length.
- Never include market timing predictions.
- Only use supported symbols: ${SUPPORTED_SYMBOLS.join(", ")}
- Use "market" as order_type unless specified.
- Buying increases exposure; selling reduces it.
- Each action must have a unique order_index starting from 0.
- Keep actions minimal: only trade what's needed to reach target.`;

interface CurrentState {
  balance_usd: number;
  available_usd: number;
  positions: {
    symbol: string;
    side: "long" | "short";
    size: number;
    mark_price: number;
    unrealized_pnl: number;
  }[];
  tickers: Record<string, number>;
}

export async function generateRebalancePlan(
  userIntent: string,
  state: CurrentState
): Promise<TradePlan> {
  const stateContext = `
Current account:
- Balance: $${state.balance_usd.toFixed(2)} USD
- Available: $${state.available_usd.toFixed(2)} USD

Current positions:
${
  state.positions.length === 0
    ? "No open positions"
    : state.positions
        .map(
          (p) =>
            `- ${p.symbol}: ${p.side} ${p.size} units @ mark price $${p.mark_price} (unrealized PnL: $${p.unrealized_pnl.toFixed(2)})`
        )
        .join("\n")
}

Current mark prices:
${Object.entries(state.tickers)
  .map(([symbol, price]) => `- ${symbol}: $${price}`)
  .join("\n")}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PLANNER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${stateContext}\n\nUser intent: ${userIntent}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "trade_plan",
          description: "Generate a rebalance trade plan",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              intent_summary: { type: "string" },
              preconditions: { type: "array", items: { type: "string" } },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    order_index: { type: "integer" },
                    action: {
                      type: "string",
                      enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"],
                    },
                    symbol: { type: "string" },
                    side: { type: "string", enum: ["buy", "sell"] },
                    order_type: { type: "string", enum: ["market", "limit"] },
                    size_usd: { type: "number" },
                    leverage: { type: "integer" },
                    note: { type: "string" },
                  },
                  required: ["order_index", "action"],
                  additionalProperties: false,
                },
              },
              user_confirmation_required: { type: "boolean", enum: [true] },
              estimated_total_mutations: { type: "integer" },
            },
            required: ["intent_summary", "preconditions", "actions", "user_confirmation_required", "estimated_total_mutations"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "trade_plan" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("Planner failed to generate a trade plan");
  }

  const plan = JSON.parse(toolCall.function.arguments) as TradePlan;
  return plan;
}
