import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock session before importing validator (validator imports session)
vi.mock("@/lib/session", () => ({
  peekPendingCommand: vi.fn(),
}));

import {
  validateSymbol,
  validateLeverage,
  validateOrderSize,
  validateBalance,
  validateConfirmationToken,
} from "@/lib/validator";
import { peekPendingCommand } from "@/lib/session";

describe("validateSymbol", () => {
  it("accepts supported symbols", () => {
    expect(() => validateSymbol("BTC-PERP")).not.toThrow();
    expect(() => validateSymbol("ETH-PERP")).not.toThrow();
    expect(() => validateSymbol("SOL-PERP")).not.toThrow();
  });

  it("rejects unsupported symbols", () => {
    expect(() => validateSymbol("DOGE-PERP")).toThrow(/Unsupported symbol/);
    expect(() => validateSymbol("BTC")).toThrow(/Unsupported symbol/);
    expect(() => validateSymbol("")).toThrow(/required/);
  });

  it("rejects undefined", () => {
    expect(() => validateSymbol(undefined)).toThrow(/required/);
  });
});

describe("validateLeverage", () => {
  it("accepts leverage within range", () => {
    expect(() => validateLeverage(1)).not.toThrow();
    expect(() => validateLeverage(5)).not.toThrow();
    expect(() => validateLeverage(10)).not.toThrow();
  });

  it("accepts undefined (leverage is optional)", () => {
    expect(() => validateLeverage(undefined)).not.toThrow();
  });

  it("rejects leverage above MAX_LEVERAGE (10)", () => {
    expect(() => validateLeverage(11)).toThrow(/exceeds maximum/);
    expect(() => validateLeverage(100)).toThrow(/exceeds maximum/);
  });

  it("rejects non-positive leverage", () => {
    expect(() => validateLeverage(0)).toThrow(/greater than 0/);
    expect(() => validateLeverage(-1)).toThrow(/greater than 0/);
  });
});

describe("validateOrderSize", () => {
  it("accepts sizes in valid range", () => {
    expect(() => validateOrderSize(10)).not.toThrow();
    expect(() => validateOrderSize(100)).not.toThrow();
    expect(() => validateOrderSize(500)).not.toThrow();
  });

  it("rejects sizes below MIN_ORDER_USD (10)", () => {
    expect(() => validateOrderSize(9)).toThrow(/below minimum/);
    expect(() => validateOrderSize(0)).toThrow(/below minimum/);
    expect(() => validateOrderSize(-5)).toThrow(/below minimum/);
  });

  it("rejects sizes above MAX_ORDER_USD (500)", () => {
    expect(() => validateOrderSize(501)).toThrow(/exceeds maximum/);
    expect(() => validateOrderSize(1000)).toThrow(/exceeds maximum/);
  });

  it("rejects undefined", () => {
    expect(() => validateOrderSize(undefined)).toThrow(/required/);
  });
});

describe("validateBalance", () => {
  it("accepts when size is within available balance", () => {
    expect(() => validateBalance(100, 500)).not.toThrow();
    expect(() => validateBalance(500, 500)).not.toThrow();
    expect(() => validateBalance(10, 10)).not.toThrow();
  });

  it("rejects when size exceeds available balance", () => {
    expect(() => validateBalance(501, 500)).toThrow(/Insufficient balance/);
    expect(() => validateBalance(100, 0)).toThrow(/Insufficient balance/);
  });
});

describe("validateConfirmationToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when peekPendingCommand succeeds", () => {
    vi.mocked(peekPendingCommand).mockReturnValue({ action: "place_order" });
    expect(() => validateConfirmationToken("valid-token")).not.toThrow();
  });

  it("throws when peekPendingCommand throws", () => {
    vi.mocked(peekPendingCommand).mockImplementation(() => {
      throw new Error("Invalid or expired confirmation token");
    });
    expect(() => validateConfirmationToken("bad-token")).toThrow(
      "Invalid or expired confirmation token"
    );
  });
});
