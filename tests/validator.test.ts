import {
  validateSymbol,
  validateLeverage,
  validateOrderSize,
  validateBalance,
} from "../lib/validator";

describe("validateSymbol", () => {
  it("passes for supported symbols", () => {
    expect(() => validateSymbol("BTC-PERP")).not.toThrow();
    expect(() => validateSymbol("ETH-PERP")).not.toThrow();
    expect(() => validateSymbol("SOL-PERP")).not.toThrow();
  });

  it("throws for unsupported symbol", () => {
    expect(() => validateSymbol("DOGE-PERP")).toThrow("Unsupported symbol");
  });

  it("throws for undefined", () => {
    expect(() => validateSymbol(undefined)).toThrow("symbol is required");
  });
});

describe("validateLeverage", () => {
  it("passes for valid leverage", () => {
    expect(() => validateLeverage(1)).not.toThrow();
    expect(() => validateLeverage(10)).not.toThrow();
    expect(() => validateLeverage(undefined)).not.toThrow();
  });

  it("throws when exceeding max", () => {
    expect(() => validateLeverage(11)).toThrow("Leverage must be between 1 and 10");
  });

  it("throws for zero", () => {
    expect(() => validateLeverage(0)).toThrow("Leverage must be between 1 and 10");
  });
});

describe("validateOrderSize", () => {
  it("passes for valid sizes", () => {
    expect(() => validateOrderSize(10)).not.toThrow();
    expect(() => validateOrderSize(250)).not.toThrow();
    expect(() => validateOrderSize(500)).not.toThrow();
  });

  it("throws below minimum", () => {
    expect(() => validateOrderSize(5)).toThrow("below minimum");
  });

  it("throws above maximum", () => {
    expect(() => validateOrderSize(501)).toThrow("exceeds maximum");
  });

  it("throws for undefined", () => {
    expect(() => validateOrderSize(undefined)).toThrow("size_usd is required");
  });
});

describe("validateBalance", () => {
  it("passes when size <= available", () => {
    expect(() => validateBalance(100, 500)).not.toThrow();
    expect(() => validateBalance(500, 500)).not.toThrow();
  });

  it("throws when size exceeds available", () => {
    expect(() => validateBalance(501, 500)).toThrow("Insufficient balance");
  });
});
