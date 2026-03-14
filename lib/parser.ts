import OpenAI from "openai";
import type { TradeCommand, TradePlan, ClarificationResponse } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PARSE_SYSTEM_PROMPT = `You are a trade command parser. Your only job is to convert a user's message into a valid JSON TradeCommand or TradePlan.

Rules:
- Output ONLY valid JSON matching the schema. No explanation, no markdown.
- size is always USD notional.
- Never include execution logic.
- If intent is ambiguous or unclear, return { "clarification_needed": "...explain what is missing..." }
- Supported symbols: BTC-PERP, ETH-PERP, SOL-PERP
- Panic keywords: "panic", "close all", "flatten", "emergency" → return { "action": "panic" }

TradeCommand schema:
{
  "action": "place_order" | "close_position" | "cancel_all_orders" | "set_tp_sl" | "rebalance_preview" | "panic",
  "symbol": "BTC-PERP" | "ETH-PERP" | "SOL-PERP",  (optional)
  "side": "buy" | "sell",  (optional)
  "order_type": "market" | "limit",  (optional, default "market")
  "size_usd": number,  (optional, USD notional)
  "price": number,  (optional, for limit orders)
  "leverage": number,  (optional)
  "tp": number,  (optional, take profit price)
  "sl": number,  (optional, stop loss price)
  "reduce_only": boolean,  (optional)
  "urgency": "panic" | "normal"  (optional)
}

TradePlan schema (for rebalance/multi-step requests):
{
  "intent_summary": string,
  "preconditions": string[],
  "actions": [],
  "user_confirmation_required": true,
  "estimated_total_mutations": number
}

For rebalance requests like "rebalance to 60% BTC 40% ETH", return a TradePlan with intent_summary describing the goal and empty actions array (the planner will fill in actions).

For complex market-based commands like "buy X based on my insight about Y", interpret the intent and suggest a reasonable BTC-PERP or ETH-PERP trade, or ask for clarification if too vague.`;

export type ParseResult = TradeCommand | TradePlan | ClarificationResponse;

export async function parseCommand(text: string): Promise<ParseResult> {
  let content: string | null = null;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
    });
    content = response.choices[0]?.message?.content ?? null;
  } catch (e) {
    return {
      clarification_needed: `Parser unavailable: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  if (!content) return { clarification_needed: "No response from parser" };

  try {
    const parsed = JSON.parse(content);
    if (parsed.clarification_needed) {
      return { clarification_needed: String(parsed.clarification_needed) };
    }
    if ("intent_summary" in parsed) {
      return parsed as TradePlan;
    }
    if ("action" in parsed) {
      return parsed as TradeCommand;
    }
    return { clarification_needed: "Unrecognized response structure" };
  } catch {
    return { clarification_needed: "Could not parse LLM response" };
  }
}
