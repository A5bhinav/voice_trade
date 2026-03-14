import { MUTATION_DELAY_MS } from "./constants";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface QueueResult<T> {
  value?: T;
  error?: string;
}

export class MutationQueue {
  private running = false;
  private tasks: Array<() => Promise<void>> = [];

  enqueue<T>(fn: () => Promise<T>): Promise<QueueResult<T>> {
    return new Promise((resolve) => {
      this.tasks.push(async () => {
        try {
          const value = await fn();
          resolve({ value });
        } catch (e) {
          resolve({ error: e instanceof Error ? e.message : String(e) });
        }
      });
      this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      await task();
      if (this.tasks.length > 0) {
        await sleep(MUTATION_DELAY_MS);
      }
    }
    this.running = false;
  }

  // Run an array of mutations sequentially, collecting results without stopping on failure
  async runAll<T>(fns: Array<() => Promise<T>>): Promise<QueueResult<T>[]> {
    const results: QueueResult<T>[] = [];
    for (const fn of fns) {
      const result = await this.enqueue(fn);
      results.push(result);
    }
    return results;
  }
}
