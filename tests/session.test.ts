import { describe, it, expect, vi, beforeEach } from "vitest";
import { storePendingCommand, consumePendingCommand, peekPendingCommand } from "@/lib/session";
import type { TradeCommand } from "@/lib/types";

const sampleCommand: TradeCommand = {
  action: "place_order",
  symbol: "BTC-PERP",
  side: "buy",
  size_usd: 100,
};

describe("storePendingCommand", () => {
  it("returns a UUID token", () => {
    const token = storePendingCommand(sampleCommand);
    expect(typeof token).toBe("string");
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("each call returns a unique token", () => {
    const t1 = storePendingCommand(sampleCommand);
    const t2 = storePendingCommand(sampleCommand);
    expect(t1).not.toBe(t2);
  });
});

describe("peekPendingCommand", () => {
  it("returns the command without consuming it", () => {
    const token = storePendingCommand(sampleCommand);
    const result1 = peekPendingCommand(token);
    const result2 = peekPendingCommand(token);
    expect(result1).toEqual(sampleCommand);
    expect(result2).toEqual(sampleCommand); // still there
  });

  it("throws for unknown token", () => {
    expect(() => peekPendingCommand("non-existent-token")).toThrow(/Invalid or expired/);
  });
});

describe("consumePendingCommand", () => {
  it("returns the stored command", () => {
    const token = storePendingCommand(sampleCommand);
    const result = consumePendingCommand(token);
    expect(result).toEqual(sampleCommand);
  });

  it("is one-use: throws on second consume", () => {
    const token = storePendingCommand(sampleCommand);
    consumePendingCommand(token);
    expect(() => consumePendingCommand(token)).toThrow(/Invalid or expired/);
  });

  it("throws for unknown token", () => {
    expect(() => consumePendingCommand("non-existent-token")).toThrow(/Invalid or expired/);
  });

  it("throws for expired token", async () => {
    // Mock Date.now to simulate expiry
    const originalNow = Date.now;
    const token = storePendingCommand(sampleCommand);

    // Fast-forward time past TTL
    vi.spyOn(Date, "now").mockReturnValue(originalNow() + 120_000);
    expect(() => consumePendingCommand(token)).toThrow(/expired/);

    vi.restoreAllMocks();
  });
});
