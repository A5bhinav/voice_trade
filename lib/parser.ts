import Anthropic from "@anthropic-ai/sdk";
import type { TradeCommand, TradePlan } from "./types";
import { LiquidClient } from "./liquid";
import { SUPPORTED_SYMBOLS } from "./constants";

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

export async function parseCommand(text: string): Promise<ParseResult> {
  // Fetch live markets so the LLM knows what's actually tradeable
  let availableSymbols: string[] = SUPPORTED_SYMBOLS;
  try {
    const markets = await LiquidClient.getMarkets();
    if (markets.length > 0) {
      availableSymbols = markets.map((m) => m.symbol);
    }
  } catch {
    // fall back to constants if Liquid is unreachable
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are an expert trading assistant. Your job is to interpret a user's market thesis or intent and translate it into one or more concrete trades using the available instruments on Liquid.

Available tradeable symbols on Liquid right now:
${availableSymbols.join(", ")}

How to interpret user intent:
- If the user expresses a directional view (e.g. "I think oil will go up", "BTC is going to dump"), find the most relevant symbol(s) from the available list that reflect that view and construct a trade.
- If the user mentions a macro theme (e.g. war, inflation, rate cuts, tech rally), reason about which available instruments are most exposed to that theme and go long or short accordingly.
- If multiple instruments are relevant, return a TradePlan with multiple actions ranked by relevance.
- If the user gives an explicit trade instruction (e.g. "buy $200 of ETH"), parse it directly.
- Panic keywords ("panic", "close all", "flatten", "emergency") → action: "panic".

Rules:
- Only use symbols from the available list above. Never invent symbols.
- size_usd is always USD notional.
- Default order_type to "market" unless the user specifies a price.
- Default leverage to 1 unless the user specifies otherwise.
- Never execute trades yourself. Output structured JSON only.
- If the user's intent is too ambiguous to map to any available instrument, use request_clarification.`,
    messages: [{ role: "user", content: text }],
    tools: [
      {
        name: "submit_trade_command",
        description: "Submit a single trade action for one instrument",
        input_schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"] },
            symbol: { type: "string", description: "Must be a symbol from the available list" },
            side: { type: "string", enum: ["buy", "sell"] },
            order_type: { type: "string", enum: ["market", "limit"] },
            size_usd: { type: "number", description: "USD notional size" },
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
        description: "Submit a multi-instrument trade plan when the user's thesis spans several markets",
        input_schema: {
          type: "object",
          properties: {
            intent_summary: { type: "string", description: "One sentence explaining the user's thesis and why these trades reflect it" },
            preconditions: { type: "array", items: { type: "string" }, description: "Risk checks or assumptions (e.g. available balance, leverage cap)" },
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
                  note: { type: "string", description: "Why this instrument reflects the user's thesis" }
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
        description: "Ask the user to clarify when intent cannot be mapped to any available instrument",
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
