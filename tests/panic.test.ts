// Mock LiquidClient before importing panic
jest.mock("../lib/liquid", () => ({
  LiquidClient: {
    cancelAllOrders: jest.fn(),
    getPositions: jest.fn(),
    closePosition: jest.fn(),
  },
}));

jest.mock("../lib/audit", () => ({
  logPanic: jest.fn(),
}));

import { LiquidClient } from "../lib/liquid";
import { executePanic } from "../lib/panic";

const mockClient = LiquidClient as jest.Mocked<typeof LiquidClient>;

describe("executePanic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels all orders then closes all positions", async () => {
    mockClient.cancelAllOrders.mockResolvedValue({ cancelled: 3 });
    mockClient.getPositions.mockResolvedValue([
      { symbol: "BTC-PERP", side: "long", size: 100, mark_price: 60000, unrealized_pnl: 10 },
      { symbol: "ETH-PERP", side: "short", size: 50, mark_price: 3000, unrealized_pnl: -5 },
    ]);
    mockClient.closePosition.mockResolvedValue({
      id: "order-1",
      symbol: "BTC-PERP",
      side: "sell",
      size: 100,
      price: null,
      status: "filled",
      created_at: new Date().toISOString(),
    });

    const result = await executePanic();

    expect(mockClient.cancelAllOrders).toHaveBeenCalledTimes(1);
    expect(mockClient.closePosition).toHaveBeenCalledWith("BTC-PERP");
    expect(mockClient.closePosition).toHaveBeenCalledWith("ETH-PERP");
    expect(result.orders_cancelled).toBe(3);
    expect(result.positions_closed).toContain("BTC-PERP");
    expect(result.positions_closed).toContain("ETH-PERP");
    expect(result.failures).toHaveLength(0);
  });

  it("records partial failures without throwing", async () => {
    mockClient.cancelAllOrders.mockResolvedValue({ cancelled: 1 });
    mockClient.getPositions.mockResolvedValue([
      { symbol: "BTC-PERP", side: "long", size: 100, mark_price: 60000, unrealized_pnl: 0 },
    ]);
    mockClient.closePosition.mockRejectedValue(new Error("exchange error"));

    const result = await executePanic();

    expect(result.positions_closed).toHaveLength(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("exchange error");
  });

  it("handles cancel orders failure gracefully", async () => {
    mockClient.cancelAllOrders.mockRejectedValue(new Error("network timeout"));
    mockClient.getPositions.mockResolvedValue([]);

    const result = await executePanic();

    expect(result.orders_cancelled).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("cancel_all_orders");
  });

  it("succeeds with no open positions", async () => {
    mockClient.cancelAllOrders.mockResolvedValue({ cancelled: 0 });
    mockClient.getPositions.mockResolvedValue([]);

    const result = await executePanic();

    expect(result.orders_cancelled).toBe(0);
    expect(result.positions_closed).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });
});
