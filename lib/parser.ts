/**
 * LLM command parser (Dev C)
 * Stub — implementation owned by Dev C.
 */

import type { TradeCommand, TradePlan } from "./types";

export interface ClarificationNeeded {
  clarification_needed: string;
}

export type ParseResult = TradeCommand | TradePlan | ClarificationNeeded;

export function isClarificationNeeded(r: ParseResult): r is ClarificationNeeded {
  return "clarification_needed" in r;
}

export function isTradePlan(r: ParseResult): r is TradePlan {
  return "actions" in r && Array.isArray((r as TradePlan).actions);
}

// Implemented by Dev C
export async function parseCommand(_text: string): Promise<ParseResult> {
  throw new Error("parseCommand not yet implemented — awaiting Dev C");
}
