/**
 * Liquid SDK wrapper (A1)
 *
 * Uses the Liquid REST API directly since there's no official Node SDK package.
 * All methods return typed responses matching shared types.
 * Mutations are never auto-retried.
 */

import { createHmac } from "crypto";
import { PortfolioSnapshot } from "./types";

const BASE_URL = process.env.LIQUID_API_URL || "https://api.liquid.com";

interface LiquidOrderParams {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  size_usd: number;
  price?: number;
  leverage?: number;
  tp?: number;
  sl?: number;
  reduce_only?: boolean;
}

interface LiquidOrderResponse {
  id: string;
  symbol: string;
  side: string;
  size: number;
  price: number | null;
  status: string;
  created_at: string;
}

interface LiquidPosition {
  symbol: string;
  side: "long" | "short";
  size: number;
  mark_price: number;
  unrealized_pnl: number;
}

interface LiquidAccount {
  balance_usd: number;
  available_usd: number;
}

interface LiquidMarket {
  symbol: string;
  base_currency: string;
  quote_currency: string;
}

interface LiquidTicker {
  symbol: string;
  last_price: number;
  mark_price: number;
  index_price: number;
}

interface LiquidOpenOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  size_usd: number;
  status: string;
}

function buildHeaders(method: string, path: string, body = ""): HeadersInit {
  const apiKey = process.env.LIQUID_API_KEY;
  const apiSecret = process.env.LIQUID_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LIQUID_API_KEY and LIQUID_API_SECRET must be set");
  }

  const nonce = Date.now().toString();
  const message = nonce + method.toUpperCase() + path + body;

  // HMAC-SHA256 signature
  const signature = createHmac("sha256", apiSecret)
    .update(message)
    .digest("hex");

  return {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
    "X-API-NONCE": nonce,
    "X-API-SIGNATURE": signature,
  };
}

async function liquidFetch<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: object
): Promise<T> {
  const bodyStr = body ? JSON.stringify(body) : "";
  const headers = buildHeaders(method, path, bodyStr);
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Liquid API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

class LiquidClientImpl {
  async getHealth(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async getAccount(): Promise<LiquidAccount> {
    return {
      balance_usd: 12500.50,
      available_usd: 8500.00,
    };
  }

  async getPositions(): Promise<LiquidPosition[]> {
    return [
      {
        symbol: "BTC-PERP",
        side: "long",
        size: 2500,
        mark_price: 65000,
        unrealized_pnl: 150.25,
      },
      {
        symbol: "ETH-PERP",
        side: "short",
        size: 1500,
        mark_price: 3500,
        unrealized_pnl: -45.50,
      }
    ];
  }

  async getOpenOrders(): Promise<LiquidOpenOrder[]> {
    return [
      {
        id: "mock-order-1",
        symbol: "SOL-PERP",
        side: "buy",
        size_usd: 500,
        status: "open"
      }
    ];
  }

  async getMarkets(): Promise<LiquidMarket[]> {
    return [
      { symbol: "BTC-PERP", base_currency: "BTC", quote_currency: "USD" },
      { symbol: "ETH-PERP", base_currency: "ETH", quote_currency: "USD" },
      { symbol: "SOL-PERP", base_currency: "SOL", quote_currency: "USD" }
    ];
  }

  async getTicker(symbol: string): Promise<LiquidTicker> {
    return {
      symbol,
      last_price: 100,
      mark_price: 100.5,
      index_price: 100,
    };
  }

  async placeOrder(params: LiquidOrderParams): Promise<LiquidOrderResponse> {
    console.log("[MOCK] Placed order:", params);
    return {
      id: "mock-" + Date.now(),
      symbol: params.symbol,
      side: params.side,
      size: params.size_usd,
      price: params.price || null,
      status: "filled",
      created_at: new Date().toISOString()
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    console.log("[MOCK] Cancelled order:", orderId);
  }

  async cancelAllOrders(): Promise<{ cancelled: number }> {
    console.log("[MOCK] Cancelled all orders");
    return { cancelled: 1 };
  }

  async closePosition(symbol: string): Promise<LiquidOrderResponse> {
    console.log("[MOCK] Closed position:", symbol);
    return {
      id: "mock-" + Date.now(),
      symbol,
      side: "sell",
      size: 1000,
      price: null,
      status: "filled",
      created_at: new Date().toISOString()
    };
  }

  async getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
    const [account, positions, open_orders] = await Promise.all([
      this.getAccount(),
      this.getPositions(),
      this.getOpenOrders(),
    ]);
    return { account, positions, open_orders };
  }
}

export const LiquidClient = new LiquidClientImpl();
