import Anthropic from "@anthropic-ai/sdk";
import type { TradeCommand, TradePlan, ProposalSet } from "./types";
import { LiquidClient } from "./liquid";

export interface ClarificationNeeded {
  clarification_needed: string;
}

export type ParseResult = TradeCommand | TradePlan | ProposalSet | ClarificationNeeded;

export function isClarificationNeeded(r: ParseResult): r is ClarificationNeeded {
  return "clarification_needed" in r;
}

export function isTradePlan(r: ParseResult): r is TradePlan {
  return "actions" in r && Array.isArray((r as TradePlan).actions);
}

export function isProposalSet(r: ParseResult): r is ProposalSet {
  return "proposals" in r && Array.isArray((r as ProposalSet).proposals);
}

export async function parseCommand(text: string): Promise<ParseResult> {
  // Fetch ALL live markets from Liquid
  let marketContext = "BTC-PERP, ETH-PERP, SOL-PERP (fallback — Liquid unreachable)";

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("market-fetch timeout")), 6000)
    );
    const markets = await Promise.race([LiquidClient.getMarkets(), timeout]);
    if (markets.length > 0) {
      marketContext = markets.map((m) => {
        const lev = m.max_leverage ? ` (max ${m.max_leverage}x)` : "";
        return `${m.symbol}${lev}`;
      }).join("\n");
    }
  } catch (err) {
    console.warn("[parser] Failed to fetch markets from Liquid — using fallback:", (err as Error).message);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const tradeCommandSchema = {
    type: "object" as const,
    properties: {
      action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "panic"] },
      symbol: { type: "string", description: "Exact symbol from the available list" },
      side: { type: "string", enum: ["buy", "sell"] },
      order_type: { type: "string", enum: ["market", "limit"] },
      size_usd: { type: "number", description: "USD notional size" },
      price: { type: "number" },
      leverage: { type: "number" },
      tp: { type: "number" },
      sl: { type: "number" },
      reduce_only: { type: "boolean" },
    },
    required: ["action"],
  };

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: `You are an expert trading assistant on Liquid. Your job is to interpret a user's market thesis and map it to real tradeable instruments.

ALL instruments on Liquid right now (scan all of them for the best match):
${marketContext}

Market types:
- Perpetual Futures (PERP): leveraged directional bets — long for bullish, short for bearish
- Spot CLOB: direct spot buying/selling
- AMM / Prediction tokens: event-based or speculative assets (e.g. election outcomes, launch prices)
- Bonding Curve tokens: newly launched, high risk/reward

Decision rules:
- EXPLICIT command ("buy $200 BTC at 3x"): use submit_trade_command.
- VAGUE intent or theme ("I think oil rips", "bearish on AI stocks", "war is coming"): use submit_proposals — scan ALL market types, find the 2-3 instruments that best capture the thesis, rank by relevance. First proposal = best fit.
- PORTFOLIO rebalance spanning multiple instruments: use submit_trade_plan.
- PANIC / close all / flatten / emergency: use submit_trade_command with action=panic.

Always:
- Use exact symbol strings from the list above.
- Default size_usd=11, order_type="market", leverage=1 unless specified.
- Minimum size_usd is $11. If user asks for less, use $11 and note it in the rationale.
- Never ask clarifying questions. Make your best call.`,
    messages: [{ role: "user", content: text }],
    tools: [
      {
        name: "submit_trade_command",
        description: "Explicit single trade: user named a specific instrument and action",
        input_schema: tradeCommandSchema,
      },
      {
        name: "submit_proposals",
        description: "Vague/thematic intent: return 2-3 ranked trade proposals that best capture the user's thesis so they can pick one",
        input_schema: {
          type: "object",
          properties: {
            user_intent: {
              type: "string",
              description: "One sentence: what does the user actually want to bet on?",
            },
            proposals: {
              type: "array",
              description: "Ranked proposals, best fit first",
              items: {
                type: "object",
                properties: {
                  rationale: {
                    type: "string",
                    description: "Why this specific instrument captures the user's thesis (1-2 sentences)",
                  },
                  command: tradeCommandSchema,
                },
                required: ["rationale", "command"],
              },
            },
          },
          required: ["user_intent", "proposals"],
        },
      },
      {
        name: "submit_trade_plan",
        description: "Multi-instrument rebalance or portfolio-level operation",
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
                  action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "panic"] },
                  symbol: { type: "string" },
                  side: { type: "string", enum: ["buy", "sell"] },
                  order_type: { type: "string", enum: ["market", "limit"] },
                  size_usd: { type: "number" },
                  order_index: { type: "number" },
                  note: { type: "string" },
                },
                required: ["action", "order_index"],
              },
            },
            user_confirmation_required: { type: "boolean", enum: [true] },
            estimated_total_mutations: { type: "number" },
          },
          required: ["intent_summary", "preconditions", "actions", "user_confirmation_required", "estimated_total_mutations"],
        },
      },
    ],
    tool_choice: { type: "any" },
  });

  const toolCall = response.content.find((c) => c.type === "tool_use");
  if (!toolCall || toolCall.type !== "tool_use") {
    throw new Error("No tool called by LLM");
  }

  return toolCall.input as ParseResult;
}
