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
  // Fetch ALL live markets from Liquid
  let marketContext = `Fallback symbols: ${SUPPORTED_SYMBOLS.join(", ")}`;
  let availableSymbols: string[] = SUPPORTED_SYMBOLS;

  try {
    const { markets, context } = await LiquidClient.getMarketWithPrices();
    if (markets.length > 0) {
      availableSymbols = markets.map((m) => m.symbol);
      marketContext = context;
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
    system: `You are an expert trading assistant on Liquid. Your job is to interpret a user's market thesis or intent and map it to the best available instruments.

ALL available instruments on Liquid right now:
${marketContext}

Market types explained:
- Perpetual Futures (perps): leveraged directional bets on crypto prices, go long or short
- Spot CLOB: direct spot trading of tokens
- AMM / Prediction-style: automated market maker pools, often includes event-based or speculative assets
- Bonding Curve / Launch: newly launched tokens, higher risk/reward

How to interpret user intent:
- Directional view ("oil going up", "BTC will dump"): find perps or spot markets that match the underlying asset. Go long for bullish, short for bearish.
- Macro theme (war, inflation, AI, energy, tech rally): scan ALL market types — perps, AMM, and bonding-curve assets — and pick what best captures the exposure. If there are prediction/event markets in the AMM section, use them if they're relevant.
- Speculative/prediction ("will X happen"): look in AMM and bonding-curve markets for event-based tokens.
- Multiple relevant instruments: return a TradePlan ranked by relevance.
- Explicit instruction ("buy $200 of ETH"): parse directly.
- Panic keywords ("panic", "close all", "flatten", "emergency") → action: "panic".

Rules:
- ALWAYS return a trade. Never ask questions. Make your best call.
- Use the exact symbol string from the available list (e.g. "BTC-PERP", "flx:OIL", "vntl:SPACEX", "xyz:NVDA").
- size_usd is always USD notional. Default to 100 if not specified.
- Default order_type to "market". Default leverage to 1.
- Never execute. Output structured JSON only.`,
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
    ],
    tool_choice: { type: "any" }
  });

  const toolCall = response.content.find((c) => c.type === "tool_use");
  if (!toolCall || toolCall.type !== "tool_use") {
    throw new Error("No tool called by LLM");
  }

  return toolCall.input as ParseResult;
}
