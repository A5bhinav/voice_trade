/**
 * Parser tests (Dev C)
 * Covers the helper functions in lib/parser.ts that are already implemented.
 * The LLM-calling parseCommand() is a stub until Dev C implements it.
 */

import { isClarificationNeeded, isTradePlan } from "../lib/parser";
import type { TradeCommand, TradePlan } from "../lib/types";

describe("isClarificationNeeded", () => {
  it("returns true for objects with clarification_needed key", () => {
    expect(isClarificationNeeded({ clarification_needed: "What symbol?" })).toBe(true);
  });

  it("returns false for a TradeCommand", () => {
    const cmd: TradeCommand = { action: "place_order", symbol: "BTC-PERP" };
    expect(isClarificationNeeded(cmd)).toBe(false);
  });
});

describe("isTradePlan", () => {
  it("returns true for a valid TradePlan", () => {
    const plan: TradePlan = {
      intent_summary: "Rebalance",
      preconditions: [],
      actions: [
        {
          order_index: 0,
          action: "place_order",
          symbol: "BTC-PERP",
          side: "buy",
          order_type: "market",
          size_usd: 200,
        },
      ],
      user_confirmation_required: true,
      estimated_total_mutations: 1,
    };
    expect(isTradePlan(plan)).toBe(true);
  });

  it("returns false for a TradeCommand", () => {
    const cmd: TradeCommand = { action: "place_order" };
    expect(isTradePlan(cmd)).toBe(false);
  });

  it("returns false for clarification response", () => {
    expect(isTradePlan({ clarification_needed: "unclear" })).toBe(false);
  });
});

describe("parseCommand (stub)", () => {
  it("throws NotImplemented until Dev C implements it", async () => {
    const { parseCommand } = require("../lib/parser");
    await expect(parseCommand("buy BTC")).rejects.toThrow("not yet implemented");
  });
});
