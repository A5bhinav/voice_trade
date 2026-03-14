import OpenAI from "openai";
import { ParseResult, TradeCommand, TradePlan } from "./types";
import { SUPPORTED_SYMBOLS, PANIC_KEYWORDS } from "./constants";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TRADE_COMMAND_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"],
    },
    symbol: { type: "string", description: "e.g. BTC-PERP" },
    side: { type: "string", enum: ["buy", "sell"] },
    order_type: { type: "string", enum: ["market", "limit"] },
    size_usd: { type: "number", description: "USD notional size" },
    price: { type: "number" },
    leverage: { type: "integer" },
    tp: { type: "number" },
    sl: { type: "number" },
    reduce_only: { type: "boolean" },
    urgency: { type: "string", enum: ["panic", "normal"] },
  },
  required: ["action"],
  additionalProperties: false,
} as const;

const TRADE_PLAN_SCHEMA = {
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
          action: { type: "string", enum: ["place_order", "close_position", "cancel_all_orders", "set_tp_sl", "rebalance_preview", "panic"] },
          symbol: { type: "string" },
          side: { type: "string", enum: ["buy", "sell"] },
          order_type: { type: "string", enum: ["market", "limit"] },
          size_usd: { type: "number" },
          price: { type: "number" },
          leverage: { type: "integer" },
          note: { type: "string" },
        },
        required: ["order_index", "action"],
      },
    },
    user_confirmation_required: { type: "boolean", enum: [true] },
    estimated_total_mutations: { type: "integer" },
  },
  required: ["intent_summary", "preconditions", "actions", "user_confirmation_required", "estimated_total_mutations"],
  additionalProperties: false,
} as const;

const CLARIFICATION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "null" },
    clarification_needed: { type: "string" },
  },
  required: ["action", "clarification_needed"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a trade command parser. Your only job is to convert a user's message into a valid JSON TradeCommand, TradePlan, or clarification request.

Rules:
- Output ONLY valid JSON matching the schema. No explanation.
- size_usd is always USD notional.
- Never include execution logic.
- If intent is ambiguous or information is missing (e.g. no symbol, no size), return clarification_needed.
- Supported symbols: ${SUPPORTED_SYMBOLS.join(", ")}
- Panic keywords: ${PANIC_KEYWORDS.join(", ")}
- For rebalancing or multi-step trades, use TradePlan format.
- For a single trade action, use TradeCommand format.
- All leverages are integers (1-10).
- Default order_type is "market" if not specified.
- If user says "buy BTC" without amount, ask for clarification.`;

export async function parseCommand(text: string): Promise<ParseResult> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    tools: [
      {
        type: "function" as const,
        function: {
          name: "trade_command",
          description: "Single trade action",
          strict: true,
          parameters: TRADE_COMMAND_SCHEMA as Record<string, unknown>,
        },
      },
      {
        type: "function" as const,
        function: {
          name: "trade_plan",
          description: "Multi-step trade plan (rebalancing, multi-action intents)",
          strict: true,
          parameters: TRADE_PLAN_SCHEMA as Record<string, unknown>,
        },
      },
      {
        type: "function" as const,
        function: {
          name: "clarification_needed",
          description: "Request clarification when intent is ambiguous or info is missing",
          strict: true,
          parameters: CLARIFICATION_SCHEMA as Record<string, unknown>,
        },
      },
    ],
    tool_choice: "required",
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { action: null, clarification_needed: "Could not parse your request. Please try again." };
  }

  const args = JSON.parse(toolCall.function.arguments);

  if (toolCall.function.name === "trade_command") {
    return args as TradeCommand;
  }
  if (toolCall.function.name === "trade_plan") {
    return args as TradePlan;
  }
  return args as { action: null; clarification_needed: string };
}
