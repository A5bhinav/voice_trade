/**
 * Planner tests (Dev C)
 * Covers the TradePlan type contract and the stub until Dev C implements it.
 */

import type { TradePlan, TradePlanAction } from "../lib/types";

describe("TradePlan schema contract", () => {
  it("requires user_confirmation_required: true", () => {
    const plan: TradePlan = {
      intent_summary: "60% BTC, 40% ETH",
      preconditions: ["sufficient balance"],
      actions: [],
      user_confirmation_required: true,
      estimated_total_mutations: 0,
    };
    expect(plan.user_confirmation_required).toBe(true);
  });

  it("estimated_total_mutations matches actions length", () => {
    const actions: TradePlanAction[] = [
      { order_index: 0, action: "place_order", symbol: "BTC-PERP", side: "buy", order_type: "market", size_usd: 300 },
      { order_index: 1, action: "place_order", symbol: "ETH-PERP", side: "buy", order_type: "market", size_usd: 200 },
    ];
    const plan: TradePlan = {
      intent_summary: "Two-asset rebalance",
      preconditions: [],
      actions,
      user_confirmation_required: true,
      estimated_total_mutations: actions.length,
    };
    expect(plan.estimated_total_mutations).toBe(plan.actions.length);
  });
});

describe("generateRebalancePlan", () => {
  it("returns parsed TradePlan from anthropic", async () => {
    // Mock Anthropic module before importing generateRebalancePlan
    const mockCreate = jest.fn().mockResolvedValue({
      content: [
        {
          type: "tool_use",
          input: { 
            intent_summary: "Test",
            preconditions: [],
            actions: [],
            user_confirmation_required: true,
            estimated_total_mutations: 0
           }
        }
      ]
    });
    jest.mock("@anthropic-ai/sdk", () => {
      return jest.fn().mockImplementation(() => ({
        messages: { create: mockCreate }
      }));
    });

    const { generateRebalancePlan } = require("../lib/planner");
    const result = await generateRebalancePlan({}, "60% BTC");
    expect(result.user_confirmation_required).toBe(true);
  });
});
