import { describe, it, expect, vi } from "vitest";
import { MutationQueue } from "@/lib/queue";

describe("MutationQueue", () => {
  it("executes a task and returns its value", async () => {
    const queue = new MutationQueue();
    const result = await queue.enqueue(async () => 42);
    expect(result).toEqual({ value: 42 });
  });

  it("captures errors without throwing", async () => {
    const queue = new MutationQueue();
    const result = await queue.enqueue(async () => {
      throw new Error("test error");
    });
    expect(result.error).toBe("test error");
    expect(result.value).toBeUndefined();
  });

  it("processes tasks sequentially", async () => {
    const queue = new MutationQueue();
    const order: number[] = [];

    const p1 = queue.enqueue(async () => {
      order.push(1);
      return 1;
    });
    const p2 = queue.enqueue(async () => {
      order.push(2);
      return 2;
    });
    const p3 = queue.enqueue(async () => {
      order.push(3);
      return 3;
    });

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("continues processing after a failure", async () => {
    const queue = new MutationQueue();

    const results = await queue.runAll([
      async () => "a",
      async () => {
        throw new Error("fail");
      },
      async () => "c",
    ]);

    expect(results[0]).toEqual({ value: "a" });
    expect(results[1].error).toBe("fail");
    expect(results[2]).toEqual({ value: "c" });
  });

  it("runAll returns results in order", async () => {
    const queue = new MutationQueue();
    const results = await queue.runAll([
      async () => 10,
      async () => 20,
      async () => 30,
    ]);
    expect(results.map((r) => r.value)).toEqual([10, 20, 30]);
  });
});
