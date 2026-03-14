import { storePendingCommand, consumePendingCommand } from "../lib/session";
import type { TradeCommand } from "../lib/types";

const sampleCommand: TradeCommand = {
  action: "place_order",
  symbol: "BTC-PERP",
  side: "buy",
  order_type: "market",
  size_usd: 100,
};

describe("session store", () => {
  it("stores and consumes a command", () => {
    const token = storePendingCommand(sampleCommand);
    expect(typeof token).toBe("string");
    const result = consumePendingCommand(token);
    expect(result).toEqual(sampleCommand);
  });

  it("token is one-use", () => {
    const token = storePendingCommand(sampleCommand);
    consumePendingCommand(token);
    expect(() => consumePendingCommand(token)).toThrow("Invalid or expired confirmation token");
  });

  it("throws for unknown token", () => {
    expect(() => consumePendingCommand("nonexistent-token")).toThrow(
      "Invalid or expired confirmation token"
    );
  });
});
