import { runSequential } from "../lib/queue";

describe("runSequential", () => {
  it("runs all tasks and returns results in order", async () => {
    const tasks = [
      () => Promise.resolve("a"),
      () => Promise.resolve("b"),
      () => Promise.resolve("c"),
    ];
    const results = await runSequential(tasks, 0);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ index: 0, ok: true, value: "a" });
    expect(results[1]).toEqual({ index: 1, ok: true, value: "b" });
    expect(results[2]).toEqual({ index: 2, ok: true, value: "c" });
  });

  it("records partial failures without stopping", async () => {
    const tasks = [
      () => Promise.resolve("ok"),
      () => Promise.reject(new Error("boom")),
      () => Promise.resolve("also ok"),
    ];
    const results = await runSequential(tasks, 0);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[1].error).toBe("boom");
    expect(results[2].ok).toBe(true);
  });

  it("returns empty for no tasks", async () => {
    const results = await runSequential([], 0);
    expect(results).toHaveLength(0);
  });
});
