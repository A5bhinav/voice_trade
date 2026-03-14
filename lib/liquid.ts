/**
 * Liquid SDK wrapper (A1)
 *
 * Uses the Liquid REST API directly since there's no official Node SDK package.
 * All methods return typed responses matching shared types.
 * Mutations are never auto-retried.
 */

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

  // HMAC-SHA256 signature — using Node crypto
  const { createHmac } = require("crypto") as typeof import("crypto");
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
    try {
      await liquidFetch<unknown>("GET", "/v2/health");
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async getAccount(): Promise<LiquidAccount> {
    const data = await liquidFetch<{ balance: string; available_balance: string }>(
      "GET",
      "/v2/accounts"
    );
    return {
      balance_usd: parseFloat(data.balance),
      available_usd: parseFloat(data.available_balance),
    };
  }

  async getPositions(): Promise<LiquidPosition[]> {
    const data = await liquidFetch<
      { instrument_id: string; side: string; size: string; mark_price: string; unrealized_pnl: string }[]
    >("GET", "/v2/positions");
    return data.map((p) => ({
      symbol: p.instrument_id,
      side: p.side === "1" ? "long" : "short",
      size: parseFloat(p.size),
      mark_price: parseFloat(p.mark_price),
      unrealized_pnl: parseFloat(p.unrealized_pnl),
    }));
  }

  async getOpenOrders(): Promise<LiquidOpenOrder[]> {
    const data = await liquidFetch<
      { id: string; instrument_id: string; side: string; quantity: string; status: string }[]
    >("GET", "/v2/orders?status=open");
    return data.map((o) => ({
      id: o.id,
      symbol: o.instrument_id,
      side: o.side === "1" ? "buy" : "sell",
      size_usd: parseFloat(o.quantity),
      status: o.status,
    }));
  }

  async getMarkets(): Promise<LiquidMarket[]> {
    const data = await liquidFetch<
      { id: string; base_currency: string; quote_currency: string }[]
    >("GET", "/v2/products");
    return data.map((m) => ({
      symbol: m.id,
      base_currency: m.base_currency,
      quote_currency: m.quote_currency,
    }));
  }

  async getTicker(symbol: string): Promise<LiquidTicker> {
    const data = await liquidFetch<{
      instrument_id: string;
      last: string;
      mark_price: string;
      index_price: string;
    }>("GET", `/v2/tickers/${symbol}`);
    return {
      symbol: data.instrument_id,
      last_price: parseFloat(data.last),
      mark_price: parseFloat(data.mark_price),
      index_price: parseFloat(data.index_price),
    };
  }

  async placeOrder(params: LiquidOrderParams): Promise<LiquidOrderResponse> {
    const body: Record<string, unknown> = {
      instrument_id: params.symbol,
      side: params.side === "buy" ? "1" : "2",
      order_type: params.order_type === "market" ? "market" : "limit",
      quantity: params.size_usd.toString(),
    };
    if (params.price !== undefined) body.price = params.price.toString();
    if (params.leverage !== undefined) body.leverage_level = params.leverage;
    if (params.reduce_only) body.reduce_only = true;

    return liquidFetch<LiquidOrderResponse>("POST", "/v2/orders", body);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await liquidFetch<unknown>("DELETE", `/v2/orders/${orderId}`);
  }

  async cancelAllOrders(): Promise<{ cancelled: number }> {
    const open = await this.getOpenOrders();
    let cancelled = 0;
    for (const o of open) {
      try {
        await this.cancelOrder(o.id);
        cancelled++;
      } catch {
        // log but continue
      }
    }
    return { cancelled };
  }

  async closePosition(symbol: string): Promise<LiquidOrderResponse> {
    const positions = await this.getPositions();
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos) throw new Error(`No open position for ${symbol}`);

    return this.placeOrder({
      symbol,
      side: pos.side === "long" ? "sell" : "buy",
      order_type: "market",
      size_usd: pos.size,
      reduce_only: true,
    });
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
