/**
 * Liquid trading client
 * REST API: https://api-public.liquidmax.xyz/v1
 * Auth: HMAC-SHA256 with X-Liquid-Key, X-Liquid-Timestamp, X-Liquid-Nonce, X-Liquid-Signature
 */

import { createHmac, createHash } from "crypto";
import { PortfolioSnapshot } from "./types";

const BASE_HOST = "https://api-public.liquidmax.xyz";
const BASE_PATH = "/v1";
const BASE_URL = BASE_HOST + BASE_PATH;

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface LiquidMarket {
  symbol: string;
  base_currency: string;
  quote_currency: string;
  max_leverage?: number;
  min_order_size?: number;
}

export interface LiquidTicker {
  symbol: string;
  mark_price: number;
  last_price: number;
  index_price: number;
  volume_24h?: number;
  change_24h?: number;
}

interface LiquidPosition {
  symbol: string;
  side: "long" | "short";
  size: number;
  mark_price: number;
  unrealized_pnl: number;
  entry_price?: number;
}

interface LiquidAccount {
  balance_usd: number;
  available_usd: number;
  equity?: number;
}

interface LiquidOpenOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  size_usd: number;
  status: string;
}

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

// ─── Auth ─────────────────────────────────────────────────────────────────────

function buildHeaders(method: string, path: string, body = ""): HeadersInit {
  const apiKey = process.env.LIQUID_API_KEY;
  const apiSecret = process.env.LIQUID_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("LIQUID_API_KEY and LIQUID_API_SECRET must be set");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  // 32-char lowercase hex nonce (matches secrets.token_hex(16) in Python SDK)
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Parse path and query separately
  const [canonicalPath, queryString] = path.split("?");
  const canonicalQuery = queryString
    ? queryString.split("&").sort().join("&")
    : "";

  const bodyHash = createHash("sha256").update(body).digest("hex");

  const message = [timestamp, nonce, method.toUpperCase(), canonicalPath, canonicalQuery, bodyHash].join("\n");
  const signature = createHmac("sha256", apiSecret).update(message).digest("hex");

  return {
    "Content-Type": "application/json",
    "X-Liquid-Key": apiKey,
    "X-Liquid-Timestamp": timestamp,
    "X-Liquid-Nonce": nonce,
    "X-Liquid-Signature": signature,
  };
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

interface LiquidResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

function sortedJson(obj: object): string {
  const sorted = Object.keys(obj).sort().reduce((acc, k) => {
    (acc as Record<string, unknown>)[k] = (obj as Record<string, unknown>)[k];
    return acc;
  }, {} as object);
  return JSON.stringify(sorted);
}

async function call<T>(method: "GET" | "POST" | "DELETE" | "PATCH", path: string, body?: object): Promise<T> {
  const bodyStr = body ? sortedJson(body) : "";
  const fullPath = `${BASE_PATH}${path}`; // e.g. /v1/markets — used for signing
  const res = await fetch(`${BASE_HOST}${fullPath}`, {
    method,
    headers: buildHeaders(method, fullPath, bodyStr),
    body: bodyStr || undefined,
    signal: AbortSignal.timeout(60000),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Liquid API returned ${res.status} ${res.statusText} (non-JSON)`);
  }
  const json = await res.json() as LiquidResponse<T>;
  if (!json.success) throw new Error(json.error?.message ?? `Liquid error on ${path}`);
  return json.data;
}

// ─── Client ───────────────────────────────────────────────────────────────────

class LiquidClientImpl {

  async getHealth(): Promise<{ ok: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json() as { status?: string };
      return { ok: data.status === "ok" };
    } catch {
      return { ok: false };
    }
  }

  async getMarkets(): Promise<LiquidMarket[]> {
    return call<LiquidMarket[]>("GET", "/markets");
  }

  async getTicker(symbol: string): Promise<LiquidTicker> {
    return call<LiquidTicker>("GET", `/markets/${symbol}/ticker`);
  }

  async getAllTickers(): Promise<LiquidTicker[]> {
    const markets = await this.getMarkets();
    const results = await Promise.allSettled(markets.map((m) => this.getTicker(m.symbol)));
    return results
      .filter((r): r is PromiseFulfilledResult<LiquidTicker> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  async getMarketWithPrices(): Promise<{ markets: LiquidMarket[]; context: string }> {
    const [markets, tickers] = await Promise.all([
      this.getMarkets(),
      this.getAllTickers().catch(() => [] as LiquidTicker[]),
    ]);

    const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

    const context = markets
      .map((m) => {
        const t = tickerMap.get(m.symbol);
        const price = t?.mark_price ? ` @ $${t.mark_price}` : "";
        const lev = m.max_leverage ? ` (max ${m.max_leverage}x leverage)` : "";
        return `${m.symbol}${price}${lev}`;
      })
      .join("\n");

    return { markets, context };
  }

  async getAccount(): Promise<LiquidAccount> {
    const data = await call<{ equity?: string | number; available_balance?: string | number; balance?: string | number }>("GET", "/account");
    return {
      balance_usd: parseFloat(String(data.equity ?? data.balance ?? 0)),
      available_usd: parseFloat(String(data.available_balance ?? 0)),
      equity: parseFloat(String(data.equity ?? 0)),
    };
  }

  async getPositions(): Promise<LiquidPosition[]> {
    return call<LiquidPosition[]>("GET", "/account/positions");
  }

  async getOpenOrders(): Promise<LiquidOpenOrder[]> {
    return call<LiquidOpenOrder[]>("GET", "/orders");
  }

  async placeOrder(params: LiquidOrderParams): Promise<LiquidOrderResponse> {
    return call<LiquidOrderResponse>("POST", "/orders", {
      symbol: params.symbol,
      side: params.side,
      type: params.order_type,
      size: params.size_usd,
      leverage: params.leverage,
      tp: params.tp,
      sl: params.sl,
      reduce_only: params.reduce_only,
      price: params.price,
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await call("DELETE", `/orders/${orderId}`);
  }

  async cancelAllOrders(): Promise<{ cancelled: number }> {
    return call<{ cancelled: number }>("DELETE", "/orders");
  }

  async closePosition(symbol: string): Promise<LiquidOrderResponse> {
    return call<LiquidOrderResponse>("POST", `/positions/${symbol}/close`);
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
