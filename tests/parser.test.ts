import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: function MockOpenAI() {
    return {
      chat: {
        completions: { create: mockCreate },
      },
    };
  },
}));

import { parseCommand } from "@/lib/parser";

function stubResponse(content: string) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content } }],
  });
}

describe("parseCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a TradeCommand for a simple buy order", async () => {
    stubResponse(
      JSON.stringify({
        action: "place_order",
        symbol: "BTC-PERP",
        side: "buy",
        size_usd: 100,
        order_type: "market",
      })
    );
    const result = await parseCommand("buy $100 of bitcoin");
    expect(result).toMatchObject({
      action: "place_order",
      symbol: "BTC-PERP",
      side: "buy",
      size_usd: 100,
    });
  });

  it("returns a TradePlan for rebalance requests", async () => {
    stubResponse(
      JSON.stringify({
        intent_summary: "Rebalance to 60% BTC, 40% ETH",
        preconditions: ["Sufficient balance"],
        actions: [],
        user_confirmation_required: true,
        estimated_total_mutations: 0,
      })
    );
    const result = await parseCommand("rebalance to 60% BTC and 40% ETH");
    expect("intent_summary" in result).toBe(true);
    if ("intent_summary" in result) {
      expect(result.intent_summary).toContain("BTC");
    }
  });

  it("returns a panic TradeCommand for panic keywords", async () => {
    stubResponse(JSON.stringify({ action: "panic" }));
    const result = await parseCommand("close all now");
    expect("action" in result).toBe(true);
    if ("action" in result) {
      expect(result.action).toBe("panic");
    }
  });

  it("returns clarification for ambiguous input", async () => {
    stubResponse(
      JSON.stringify({ clarification_needed: "Which symbol do you want to trade?" })
    );
    const result = await parseCommand("buy something");
    expect("clarification_needed" in result).toBe(true);
    if ("clarification_needed" in result) {
      expect(typeof result.clarification_needed).toBe("string");
    }
  });

  it("handles OpenAI API errors gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("rate limit"));
    const result = await parseCommand("buy bitcoin");
    expect("clarification_needed" in result).toBe(true);
    if ("clarification_needed" in result) {
      expect(result.clarification_needed).toMatch(/unavailable/i);
    }
  });

  it("handles malformed JSON from LLM gracefully", async () => {
    stubResponse("not valid json {{{");
    const result = await parseCommand("buy bitcoin");
    expect("clarification_needed" in result).toBe(true);
  });

  it("handles null LLM response gracefully", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });
    const result = await parseCommand("buy bitcoin");
    expect("clarification_needed" in result).toBe(true);
  });
});
