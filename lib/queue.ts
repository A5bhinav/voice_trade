/**
 * Mutation queue (A4)
 * Processes one mutation at a time with MUTATION_DELAY_MS between calls.
 * Returns results in order; records partial failures without stopping.
 */

import { MUTATION_DELAY_MS } from "./constants";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface QueueResult<T> {
  index: number;
  ok: boolean;
  value?: T;
  error?: string;
}

export async function runSequential<T>(
  tasks: (() => Promise<T>)[],
  delayMs = MUTATION_DELAY_MS
): Promise<QueueResult<T>[]> {
  const results: QueueResult<T>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    if (i > 0) await delay(delayMs);
    try {
      const value = await tasks[i]();
      results.push({ index: i, ok: true, value });
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
