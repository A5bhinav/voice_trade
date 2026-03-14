import { liquidClient } from "./liquid";
import { MutationQueue } from "./queue";
import { consumePendingCommand } from "./session";
import { logPanic } from "./audit";
import type { TradeCommand } from "./types";

export interface PanicResult {
  orders_cancelled: number;
  positions_closed: string[];
  failures: string[];
}

export async function orchestratePanic(confirmationToken: string): Promise<PanicResult> {
  // Validate and consume token — throws if invalid/expired
  const command = consumePendingCommand(confirmationToken) as TradeCommand;
  if (command.action !== "panic") {
    throw new Error("Invalid token: not a panic authorization");
  }

  const queue = new MutationQueue();
  const failures: string[] = [];
  let orders_cancelled = 0;
  const positions_closed: string[] = [];

  // Step 1: fetch current state
  const [openOrders, positions] = await Promise.all([
    liquidClient.getOpenOrders(),
    liquidClient.getPositions(),
  ]);

  // Step 2: cancel all open orders
  const cancelTasks = openOrders.map((order) => () => liquidClient.cancelOrder(String(order.id)));
  const cancelResults = await queue.runAll(cancelTasks);
  cancelResults.forEach((r, i) => {
    if (r.error) {
      failures.push(`Cancel order ${openOrders[i].id}: ${r.error}`);
    } else {
      orders_cancelled++;
    }
  });

  // Step 3: close all positions
  const closeTasks = positions.map((pos) => () => liquidClient.closePosition(String(pos.id)));
  const closeResults = await queue.runAll(closeTasks);
  closeResults.forEach((r, i) => {
    const symbol =
      positions[i].product_code.replace("USD", "-PERP") || positions[i].product_code;
    if (r.error) {
      failures.push(`Close position ${positions[i].id} (${symbol}): ${r.error}`);
    } else {
      positions_closed.push(symbol);
    }
  });

  logPanic({ orders: openOrders.length, positions: positions.length }, {
    orders_cancelled,
    positions_closed,
    failures,
  });

  return { orders_cancelled, positions_closed, failures };
}
