export type TradeAction =
  | "place_order"
  | "close_position"
  | "cancel_all_orders"
  | "set_tp_sl"
  | "rebalance_preview"
  | "panic";

export interface TradeCommand {
  action: TradeAction;
  symbol?: string;
  side?: "buy" | "sell";
  order_type?: "market" | "limit";
  size_usd?: number;
  price?: number;
  leverage?: number;
  tp?: number;
  sl?: number;
  reduce_only?: boolean;
  urgency?: "panic" | "normal";
}

export interface TradePlanAction extends TradeCommand {
  order_index: number;
  note?: string;
}

export interface TradePlan {
  intent_summary: string;
  preconditions: string[];
  actions: TradePlanAction[];
  user_confirmation_required: true;
  estimated_total_mutations: number;
}

export interface PreviewCard {
  type: "trade" | "rebalance" | "panic";
  summary: string;
  details: Record<string, string | number>;
  confirmation_token: string;
  warnings: string[];
}

export interface ExecutionReceipt {
  id: string;
  type: "order" | "panic" | "rebalance";
  status: "executed" | "partial" | "failed";
  liquid_order_ids: string[];
  error?: string;
  timestamp: string;
}

export interface PanicPreview {
  open_orders_count: number;
  open_positions: { symbol: string; size: number }[];
  estimated_mutations: number;
  confirmation_token: string;
}

export interface PortfolioSnapshot {
  account: {
    balance_usd: number;
    available_usd: number;
  };
  positions: {
    symbol: string;
    side: "long" | "short";
    size: number;
    mark_price: number;
    unrealized_pnl: number;
  }[];
  open_orders: {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    size_usd: number;
    status: string;
  }[];
}

export interface ClarificationResponse {
  clarification_needed: string;
}

export type ParseResponse = TradeCommand | TradePlan | ClarificationResponse;
