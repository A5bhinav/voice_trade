/**
 * Rebalance plan generator (Dev C)
 * Stub — implementation owned by Dev C.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { TradePlan } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function generateRebalancePlan(
  currentState: unknown,
  userIntent: string
): Promise<TradePlan> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    system: `You are a portfolio rebalance planner. Given current positions and a target allocation, generate a TradePlan JSON.
Rules:
- Output ONLY valid TradePlan JSON using the provided tool.
- size_usd values must be USD notional.
- Always set user_confirmation_required: true.
- Compute estimated_total_mutations from actions array length.
- Never include market timing predictions.`,
    messages: [
      {
        role: "user",
        content: `Current State:\n${JSON.stringify(currentState, null, 2)}\n\nUser Intent: ${userIntent}`
      }
    ],
    tools: [
      {
        name: "submit_trade_plan",
        description: "Submit a sequence of trade actions for rebalancing",
        input_schema: {
          type: "object",
          properties: {
            intent_summary: { type: "string" },
            preconditions: { type: "array", items: { type: "string" } },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"] },
                  symbol: { type: "string" },
                  side: { type: "string", enum: ["buy", "sell"] },
                  order_type: { type: "string", enum: ["market", "limit"] },
                  size_usd: { type: "number" },
                  order_index: { type: "number" },
                  note: { type: "string" }
                },
                required: ["action", "order_index"]
              }
            },
            user_confirmation_required: { type: "boolean", enum: [true] },
            estimated_total_mutations: { type: "number" }
          },
          required: ["intent_summary", "preconditions", "actions", "user_confirmation_required", "estimated_total_mutations"]
        }
      }
    ],
    tool_choice: { type: "tool", name: "submit_trade_plan" }
  });

  const toolCall = response.content.find((c) => c.type === "tool_use");
  if (!toolCall || toolCall.type !== "tool_use") {
    throw new Error("No tool called by LLM");
  }

  return toolCall.input as TradePlan;
}
