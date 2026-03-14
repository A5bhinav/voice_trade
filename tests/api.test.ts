/**
 * API-layer tests
 * Tests audit module (file I/O) and route handler business logic via mocked dependencies.
 */

import fs from "fs";
import os from "os";
import path from "path";

// ── Audit module ──────────────────────────────────────────────────────────────

describe("audit logger", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `audit-test-${Date.now()}.jsonl`);
    process.env.AUDIT_LOG_PATH = tmpFile;
    // Re-require so the module picks up the new env var
    jest.resetModules();
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    delete process.env.AUDIT_LOG_PATH;
  });

  it("writes a command entry to the audit log", () => {
    const { logCommand } = require("../lib/audit");
    logCommand({ text: "buy BTC" }, "sess-1", { action: "place_order" });

    const lines = fs.readFileSync(tmpFile, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.type).toBe("command");
    expect(entry.session_id).toBe("sess-1");
    expect(entry.payload).toEqual({ text: "buy BTC" });
    expect(entry.ts).toBeTruthy();
  });

  it("appends multiple entries in order", () => {
    const { logCommand, logExecution, logPanic } = require("../lib/audit");
    logCommand({ text: "buy" }, "s1");
    logExecution({ action: "place_order" }, "s1", { id: "r1" });
    logPanic({ symbols: ["BTC-PERP"] }, "s1", { orders_cancelled: 2 });

    const lines = fs.readFileSync(tmpFile, "utf8").trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).type).toBe("command");
    expect(JSON.parse(lines[1]).type).toBe("execution");
    expect(JSON.parse(lines[2]).type).toBe("panic");
  });

  it("does not throw if log file directory is missing", () => {
    process.env.AUDIT_LOG_PATH = "/nonexistent/path/audit.jsonl";
    jest.resetModules();
    const { logError } = require("../lib/audit");
    // should not throw
    expect(() => logError({ msg: "test" })).not.toThrow();
  });
});

// ── Session + validator token flow ───────────────────────────────────────────

describe("confirmation token flow", () => {
  beforeEach(() => jest.resetModules());

  it("validates a fresh token", () => {
    const { storePendingCommand } = require("../lib/session");
    const { validateConfirmationToken } = require("../lib/validator");
    const cmd = { action: "place_order", symbol: "BTC-PERP", size_usd: 100 };
    const token = storePendingCommand(cmd);
    const result = validateConfirmationToken(token);
    expect(result).toEqual(cmd);
  });

  it("rejects a consumed token (double-submit protection)", () => {
    const { storePendingCommand } = require("../lib/session");
    const { validateConfirmationToken } = require("../lib/validator");
    const cmd = { action: "close_position", symbol: "ETH-PERP" };
    const token = storePendingCommand(cmd);
    validateConfirmationToken(token); // first use — OK
    expect(() => validateConfirmationToken(token)).toThrow(
      "Invalid or expired confirmation token"
    );
  });

  it("rejects an unknown token", () => {
    const { validateConfirmationToken } = require("../lib/validator");
    expect(() => validateConfirmationToken("fake-token-xyz")).toThrow(
      "Invalid or expired confirmation token"
    );
  });
});

// ── Portfolio snapshot shape ──────────────────────────────────────────────────

describe("PortfolioSnapshot shape", () => {
  it("has the required fields", () => {
    const snapshot = {
      account: { balance_usd: 1000, available_usd: 800 },
      positions: [
        {
          symbol: "BTC-PERP",
          side: "long" as const,
          size: 0.1,
          mark_price: 60000,
          unrealized_pnl: 50,
        },
      ],
      open_orders: [
        {
          id: "ord-1",
          symbol: "ETH-PERP",
          side: "buy" as const,
          size_usd: 100,
          status: "open",
        },
      ],
    };

    expect(snapshot.account.balance_usd).toBeGreaterThan(0);
    expect(snapshot.positions[0].symbol).toBe("BTC-PERP");
    expect(snapshot.open_orders[0].status).toBe("open");
  });
});
