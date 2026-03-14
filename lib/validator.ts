/**
 * Server-side trade validator
 * All functions throw on violation — deterministic, no side effects.
 */

import { MAX_LEVERAGE, MIN_ORDER_USD, MAX_ORDER_USD, SUPPORTED_SYMBOLS } from "./constants";
import { consumePendingCommand } from "./session";
import type { TradeCommand, TradePlan } from "./types";

export function validateSymbol(symbol: string | undefined): void {
  if (!symbol) throw new Error("symbol is required");
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    throw new Error(`Unsupported symbol: ${symbol}. Supported: ${SUPPORTED_SYMBOLS.join(", ")}`);
  }
}

export function validateLeverage(leverage: number | undefined): void {
  if (leverage === undefined) return;
  if (leverage < 1 || leverage > MAX_LEVERAGE) {
    throw new Error(`Leverage must be between 1 and ${MAX_LEVERAGE}. Got: ${leverage}`);
  }
}

export function validateOrderSize(size_usd: number | undefined): void {
  if (size_usd === undefined || size_usd === null) {
    throw new Error("size_usd is required");
  }
  if (size_usd < MIN_ORDER_USD) {
    throw new Error(`Order size $${size_usd} is below minimum $${MIN_ORDER_USD}`);
  }
  if (size_usd > MAX_ORDER_USD) {
    throw new Error(`Order size $${size_usd} exceeds maximum $${MAX_ORDER_USD}`);
  }
}

export function validateBalance(size_usd: number, available_usd: number): void {
  if (size_usd > available_usd) {
    throw new Error(
      `Insufficient balance. Required: $${size_usd}, Available: $${available_usd.toFixed(2)}`
    );
  }
}

export function validateConfirmationToken(token: string): TradeCommand | TradePlan {
  // consumePendingCommand throws if invalid or expired
  return consumePendingCommand(token);
}

export function validateTradeCommand(
  cmd: TradeCommand,
  available_usd: number
): void {
  if (cmd.action === "place_order") {
    validateSymbol(cmd.symbol);
    validateOrderSize(cmd.size_usd);
    validateLeverage(cmd.leverage);
    validateBalance(cmd.size_usd!, available_usd);
  } else if (cmd.action === "close_position") {
    validateSymbol(cmd.symbol);
  } else if (cmd.action === "set_tp_sl") {
    validateSymbol(cmd.symbol);
  }
}
