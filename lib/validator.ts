/**
 * Server-side trade validation — owned by Dev A.
 * These deterministic validators are used by Dev C's preview routes.
 */

import { SUPPORTED_SYMBOLS, MAX_LEVERAGE, MIN_ORDER_USD, MAX_ORDER_USD } from "./constants";

export function validateSymbol(symbol: string): void {
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    throw new Error(`Invalid symbol "${symbol}". Supported: ${SUPPORTED_SYMBOLS.join(", ")}`);
  }
}

export function validateLeverage(leverage: number): void {
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > MAX_LEVERAGE) {
    throw new Error(`Leverage must be an integer between 1 and ${MAX_LEVERAGE}. Got: ${leverage}`);
  }
}

export function validateOrderSize(size_usd: number): void {
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
      `Order size $${size_usd} exceeds available balance $${available_usd.toFixed(2)}`
    );
  }
}

export function validateConfirmationToken(token: string): void {
  // Token format validation only — actual lookup is in session.ts
  if (!token || typeof token !== "string" || token.length < 10) {
    throw new Error("Invalid confirmation token format");
  }
}
