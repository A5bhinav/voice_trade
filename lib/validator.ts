import {
  MAX_LEVERAGE,
  MAX_ORDER_USD,
  MIN_ORDER_USD,
  SUPPORTED_SYMBOLS,
} from "./constants";
import { peekPendingCommand } from "./session";

export function validateSymbol(symbol: string | undefined): void {
  if (!symbol) throw new Error("Symbol is required");
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    throw new Error(
      `Unsupported symbol "${symbol}". Supported: ${SUPPORTED_SYMBOLS.join(", ")}`
    );
  }
}

export function validateLeverage(leverage: number | undefined): void {
  if (leverage === undefined || leverage === null) return; // leverage is optional
  if (leverage <= 0) throw new Error("Leverage must be greater than 0");
  if (leverage > MAX_LEVERAGE) {
    throw new Error(`Leverage ${leverage}x exceeds maximum ${MAX_LEVERAGE}x`);
  }
}

export function validateOrderSize(size_usd: number | undefined): void {
  if (size_usd === undefined || size_usd === null) {
    throw new Error("Order size (size_usd) is required");
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
      `Insufficient balance: order $${size_usd} exceeds available $${available_usd.toFixed(2)}`
    );
  }
}

export function validateConfirmationToken(token: string): void {
  // peekPendingCommand throws if token is missing or expired
  peekPendingCommand(token);
}
