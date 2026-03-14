/**
 * Panic flow orchestration (A5 / panic.ts)
 * Sequential: cancel all orders first, then close each position via queue.
 */

import { LiquidClient } from "./liquid";
import { runSequential } from "./queue";
import { logPanic } from "./audit";

export interface PanicResult {
  orders_cancelled: number;
  positions_closed: string[];
  failures: string[];
}

export async function executePanic(session_id = "anon"): Promise<PanicResult> {
  const failures: string[] = [];
  let orders_cancelled = 0;

  // Step 1: cancel all open orders
  try {
    const result = await LiquidClient.cancelAllOrders();
    orders_cancelled = result.cancelled;
  } catch (err) {
    failures.push(
      `cancel_all_orders: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Step 2: close each position sequentially via queue
  const positions = await LiquidClient.getPositions().catch(() => []);
  const symbols = positions.map((p) => p.symbol);

  const closeTasks = symbols.map(
    (symbol) => () => LiquidClient.closePosition(symbol)
  );

  const results = await runSequential(closeTasks);
  const positions_closed: string[] = [];

  for (const r of results) {
    if (r.ok) {
      positions_closed.push(symbols[r.index]);
    } else {
      failures.push(`close_position(${symbols[r.index]}): ${r.error}`);
    }
  }

  const panicResult: PanicResult = { orders_cancelled, positions_closed, failures };
  logPanic({ symbols, orders_cancelled }, session_id, panicResult);

  return panicResult;
}
