/**
 * Liquid SDK wrapper — owned by Dev A.
 * This stub defines the interface that Dev C's routes depend on.
 * Dev A will replace the implementations with real Liquid API calls.
 */

export interface LiquidAccount {
  balance_usd: number;
  available_usd: number;
}

export interface LiquidPosition {
  symbol: string;
  side: "long" | "short";
  size: number;
  mark_price: number;
  unrealized_pnl: number;
}

export interface LiquidOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  size_usd: number;
  status: string;
}

export interface LiquidTicker {
  symbol: string;
  mark_price: number;
  bid: number;
  ask: number;
}

export interface PlaceOrderParams {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  size_usd: number;
  leverage?: number;
  price?: number;
  tp?: number;
  sl?: number;
  reduce_only?: boolean;
}

export interface LiquidClientInterface {
  getHealth(): Promise<{ ok: boolean }>;
  getAccount(): Promise<LiquidAccount>;
  getPositions(): Promise<LiquidPosition[]>;
  getOpenOrders(): Promise<LiquidOrder[]>;
  getMarkets(): Promise<string[]>;
  getTicker(symbol: string): Promise<LiquidTicker>;
  placeOrder(params: PlaceOrderParams): Promise<{ order_id: string }>;
  cancelAllOrders(): Promise<{ cancelled: number }>;
  cancelOrder(orderId: string): Promise<void>;
  closePosition(symbol: string, sizeCoins?: number): Promise<{ order_id: string }>;
}

class LiquidClientStub implements LiquidClientInterface {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async getHealth() {
    // TODO (Dev A): implement real Liquid health check
    return { ok: true };
  }

  async getAccount(): Promise<LiquidAccount> {
    // TODO (Dev A): implement GET /v1/account
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async getPositions(): Promise<LiquidPosition[]> {
    // TODO (Dev A): implement GET /v1/account/positions
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async getOpenOrders(): Promise<LiquidOrder[]> {
    // TODO (Dev A): implement GET /v1/orders
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async getMarkets(): Promise<string[]> {
    // TODO (Dev A): implement GET /v1/markets
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async getTicker(symbol: string): Promise<LiquidTicker> {
    // TODO (Dev A): implement GET /v1/markets/{symbol}/ticker
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async placeOrder(params: PlaceOrderParams): Promise<{ order_id: string }> {
    // TODO (Dev A): implement POST /v1/orders
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async cancelAllOrders(): Promise<{ cancelled: number }> {
    // TODO (Dev A): implement DELETE /v1/orders
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async cancelOrder(orderId: string): Promise<void> {
    // TODO (Dev A): implement DELETE /v1/orders/{order_id}
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }

  async closePosition(symbol: string, sizeCoins?: number): Promise<{ order_id: string }> {
    // TODO (Dev A): implement POST /v1/positions/{symbol}/close
    throw new Error("LiquidClient not implemented — Dev A task A1");
  }
}

let _client: LiquidClientInterface | null = null;

export function getLiquidClient(): LiquidClientInterface {
  if (!_client) {
    const apiKey = process.env.LIQUID_API_KEY;
    const apiSecret = process.env.LIQUID_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error("LIQUID_API_KEY and LIQUID_API_SECRET must be set in .env.local");
    }
    _client = new LiquidClientStub(apiKey, apiSecret);
  }
  return _client;
}
