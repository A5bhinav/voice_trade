/**
 * LLM command parser (Dev C)
 * Stub — implementation owned by Dev C.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { TradeCommand, TradePlan } from "./types";

export interface ClarificationNeeded {
  clarification_needed: string;
}

export type ParseResult = TradeCommand | TradePlan | ClarificationNeeded;

export function isClarificationNeeded(r: ParseResult): r is ClarificationNeeded {
  return "clarification_needed" in r;
}

export function isTradePlan(r: ParseResult): r is TradePlan {
  return "actions" in r && Array.isArray((r as TradePlan).actions);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function parseCommand(text: string): Promise<ParseResult> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    system: `You are a trade command parser. Your only job is to convert a user's message into a valid JSON TradeCommand or TradePlan.
Rules:
- Output ONLY valid JSON matching the schema. No explanation.
- size is always USD notional.
- Never include execution logic.
- If intent is ambiguous, request clarification.
- Supported symbols: BTC-PERP, ETH-PERP, SOL-PERP
- Panic keywords: "panic", "close all", "flatten"`,
    messages: [{ role: "user", content: text }],
    tools: [
      {
        name: "submit_trade_command",
        description: "Submit a single trade action",
        input_schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"] },
            symbol: { type: "string" },
            side: { type: "string", enum: ["buy", "sell"] },
            order_type: { type: "string", enum: ["market", "limit"] },
            size_usd: { type: "number" },
            price: { type: "number" },
            leverage: { type: "number" },
            tp: { type: "number" },
            sl: { type: "number" },
            reduce_only: { type: "boolean" },
            urgency: { type: "string", enum: ["panic", "normal"] }
          },
          required: ["action"]
        }
      },
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
      },
      {
        name: "request_clarification",
        description: "Request clarification if the user intent is ambiguous",
        input_schema: {
          type: "object",
          properties: {
            clarification_needed: { type: "string" }
          },
          required: ["clarification_needed"]
        }
      }
    ],
    tool_choice: { type: "any" }
  });

  const toolCall = response.content.find((c) => c.type === "tool_use");
  if (!toolCall || toolCall.type !== "tool_use") {
    throw new Error("No tool called by LLM");
  }

  return toolCall.input as ParseResult;
}
