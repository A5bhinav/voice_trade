import { TradeCommand, TradePlan } from "./types";
import { CONFIRMATION_TOKEN_TTL_MS } from "./constants";

interface PendingCommand {
  command: TradeCommand | TradePlan;
  expires: number;
}

const store = new Map<string, PendingCommand>();

export function storePendingCommand(command: TradeCommand | TradePlan): string {
  const token = crypto.randomUUID();
  store.set(token, { command, expires: Date.now() + CONFIRMATION_TOKEN_TTL_MS });
  return token;
}

export function consumePendingCommand(token: string): TradeCommand | TradePlan {
  const entry = store.get(token);
  if (!entry) throw new Error("Invalid or expired confirmation token");
  if (Date.now() > entry.expires) {
    store.delete(token);
    throw new Error("Confirmation token expired");
  }
  store.delete(token);
  return entry.command;
}

export function peekPendingCommand(token: string): TradeCommand | TradePlan {
  const entry = store.get(token);
  if (!entry) throw new Error("Invalid or expired confirmation token");
  if (Date.now() > entry.expires) {
    store.delete(token);
    throw new Error("Confirmation token expired");
  }
  return entry.command;
}
