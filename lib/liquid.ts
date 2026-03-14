import { createHmac } from "crypto";
import type { PortfolioSnapshot } from "./types";

const API_URL = process.env.LIQUID_API_URL || "https://api.liquid.com";
const API_KEY = process.env.LIQUID_API_KEY || "";
const API_SECRET = process.env.LIQUID_API_SECRET || "";

// Symbol → Liquid product ID (configure via env for different environments)
const SYMBOL_TO_PRODUCT_ID: Record<string, number> = {
  "BTC-PERP": parseInt(process.env.LIQUID_PRODUCT_BTC_PERP || "604"),
  "ETH-PERP": parseInt(process.env.LIQUID_PRODUCT_ETH_PERP || "625"),
  "SOL-PERP": parseInt(process.env.LIQUID_PRODUCT_SOL_PERP || "662"),
};

// Reverse map for portfolio display
const PRODUCT_CODE_TO_SYMBOL: Record<string, string> = {
  BTCUSD: "BTC-PERP",
  ETHUSD: "ETH-PERP",
  SOLUSD: "SOL-PERP",
  "BTCUSD-PERP": "BTC-PERP",
  "ETHUSD-PERP": "ETH-PERP",
  "SOLUSD-PERP": "SOL-PERP",
};

function resolveSymbol(productCode: string): string {
  return PRODUCT_CODE_TO_SYMBOL[productCode] ?? productCode;
}

function signJWT(path: string): string {
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ path, nonce: String(Date.now()), token_id: API_KEY })
  ).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const sig = createHmac("sha256", API_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

async function liquidRequest<T>(method: string, path: string, body?: object): Promise<T> {
  if (!API_KEY || !API_SECRET) {
    throw new Error("Liquid API credentials not configured");
  }
  const token = signJWT(path);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Quoine-API-Version": "2",
      "X-Quoine-Auth": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Liquid API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface LiquidPosition {
  id: string;
  product_id: number;
  product_code: string;
  side: "long" | "short";
  quantity: string;
  mark_price: string;
  unrealized_pnl: string;
}

export interface LiquidOrder {
  id: string;
  product_id: number;
  product_code: string;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  status: string;
}

interface LiquidBalance {
  currency: string;
  balance: string;
  reserved_balance: string;
}

interface LiquidProduct {
  id: number;
  product_code: string;
  last_traded_price: string;
  last_price_24h: string;
  market_ask: string;
  market_bid: string;
}

export class LiquidClient {
  async getHealth(): Promise<{ status: "ok" | "error" }> {
    try {
      await liquidRequest("GET", "/v2/accounts/balance");
      return { status: "ok" };
    } catch {
      return { status: "error" };
    }
  }

  async getAccount(): Promise<LiquidBalance[]> {
    return liquidRequest<LiquidBalance[]>("GET", "/v2/accounts/balance");
  }

  async getPositions(): Promise<LiquidPosition[]> {
    return liquidRequest<LiquidPosition[]>("GET", "/v2/positions?status=open");
  }

  async getOpenOrders(): Promise<LiquidOrder[]> {
    const res = await liquidRequest<{ models: LiquidOrder[] }>("GET", "/v2/orders?status=live");
    return res.models ?? [];
  }

  async getMarkets(): Promise<LiquidProduct[]> {
    return liquidRequest<LiquidProduct[]>("GET", "/v2/products");
  }

  async getTicker(symbol: string): Promise<{ mark_price: number; bid: number; ask: number }> {
    const productId = SYMBOL_TO_PRODUCT_ID[symbol];
    if (!productId) throw new Error(`Unknown symbol: ${symbol}`);
    const product = await liquidRequest<LiquidProduct>("GET", `/v2/products/${productId}`);
    return {
      mark_price: parseFloat(product.last_traded_price) || 0,
      bid: parseFloat(product.market_bid) || 0,
      ask: parseFloat(product.market_ask) || 0,
    };
  }

  async placeOrder(params: {
    symbol: string;
    side: "buy" | "sell";
    order_type: "market" | "limit";
    size_usd: number;
    price?: number;
    leverage?: number;
  }): Promise<{ id: string }> {
    const productId = SYMBOL_TO_PRODUCT_ID[params.symbol];
    if (!productId) throw new Error(`Unknown symbol: ${params.symbol}`);
    const ticker = await this.getTicker(params.symbol);
    const refPrice = params.order_type === "limit" && params.price ? params.price : ticker.mark_price;
    if (!refPrice) throw new Error(`Cannot determine price for ${params.symbol}`);
    const quantity = (params.size_usd / refPrice).toFixed(8);
    const orderBody: Record<string, unknown> = {
      order_type: params.order_type,
      product_id: productId,
      side: params.side,
      quantity,
      ...(params.order_type === "limit" && params.price
        ? { price: String(params.price) }
        : {}),
      ...(params.leverage ? { leverage_level: params.leverage } : {}),
    };
    return liquidRequest<{ id: string }>("POST", "/v2/orders", { order: orderBody });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await liquidRequest("PUT", `/v2/orders/${orderId}/cancel`);
  }

  async cancelAllOrders(): Promise<number> {
    const orders = await this.getOpenOrders();
    let cancelled = 0;
    for (const order of orders) {
      try {
        await liquidRequest("PUT", `/v2/orders/${order.id}/cancel`);
        cancelled++;
      } catch {
        // continue on individual failures
      }
    }
    return cancelled;
  }

  async closePosition(positionId: string): Promise<void> {
    await liquidRequest("PUT", `/v2/positions/${positionId}/close`);
  }

  async getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
    const [balances, rawPositions, rawOrders] = await Promise.all([
      this.getAccount(),
      this.getPositions(),
      this.getOpenOrders(),
    ]);

    const usd = balances.find((b) => b.currency === "USD");
    const balance_usd = parseFloat(usd?.balance ?? "0");
    const reserved = parseFloat(usd?.reserved_balance ?? "0");
    const available_usd = Math.max(0, balance_usd - reserved);

    const positions = rawPositions.map((p) => ({
      symbol: resolveSymbol(p.product_code),
      side: p.side,
      size: parseFloat(p.quantity) || 0,
      mark_price: parseFloat(p.mark_price) || 0,
      unrealized_pnl: parseFloat(p.unrealized_pnl) || 0,
    }));

    const open_orders = rawOrders.map((o) => {
      const qty = parseFloat(o.quantity) || 0;
      const price = parseFloat(o.price) || 0;
      return {
        id: String(o.id),
        symbol: resolveSymbol(o.product_code),
        side: o.side,
        size_usd: qty * price,
        status: o.status,
      };
    });

    return { account: { balance_usd, available_usd }, positions, open_orders };
  }
}

export const liquidClient = new LiquidClient();
