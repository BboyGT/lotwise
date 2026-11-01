import { describe, it, expect } from "vitest";
import { calculateTrade, effectivePipValue } from "../src/lib/calculator";
import { getSymbol } from "../src/lib/symbols-v3";

const sym = (id: string) => {
  const s = getSymbol(id);
  if (!s) throw new Error(`symbol ${id} missing`);
  return s;
};

describe("calculateTrade validation", () => {
  it("rejects non-positive balance", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 0, riskPercent: 1, entry: 1.1, stopLoss: 1.09, takeProfit: 1.12 });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/balance/i);
  });

  it("rejects SL equal to entry", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.1, takeProfit: 1.12 });
    expect(r.valid).toBe(false);
  });

  it("rejects TP on the wrong side for a long", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.09, takeProfit: 1.08 });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/long/i);
  });

  it("rejects TP on the wrong side for a short", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.11, takeProfit: 1.12 });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/short/i);
  });

  it("rejects risk above 100%", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 101, entry: 1.1, stopLoss: 1.09, takeProfit: 1.12 });
    expect(r.valid).toBe(false);
  });
});

describe("calculateTrade sizing", () => {
  it("EUR/USD: $1000, 1% risk, 50 pip stop => 0.02 lot, $10 pip value", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.095, takeProfit: 1.11 });
    expect(r.valid).toBe(true);
    expect(r.riskAmount).toBeCloseTo(10, 6);
    expect(r.slPips).toBeCloseTo(50, 6);
    expect(r.tpPips).toBeCloseTo(100, 6);
    expect(r.recommendedLot).toBeCloseTo(0.02, 6);
    expect(r.actualLoss).toBeLessThanOrEqual(r.riskAmount + 1e-9);
    expect(r.rrRatio).toBeCloseTo(2, 6);
  });

  it("never risks more than the budget (lot rounded down)", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 5000, riskPercent: 2, entry: 1.0853, stopLoss: 1.0821, takeProfit: 1.0917 });
    expect(r.valid).toBe(true);
    expect(r.actualLoss).toBeLessThanOrEqual(r.riskAmount + 1e-9);
  });

  it("does not round up when the exact lot is just above a step", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 100.00009, riskPercent: 1, entry: 1.1, stopLoss: 1.099, takeProfit: 1.102 });
    expect(r.valid).toBe(true);
    expect(r.exactLot).toBeCloseTo(0.010000009, 10);
    expect(r.recommendedLot).toBe(0.01);
    expect(r.actualLoss).toBeLessThanOrEqual(r.riskAmount);
  });

  it("flags min-lot breach with excess risk", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 100, riskPercent: 1, entry: 1.1, stopLoss: 1.09, takeProfit: 1.12 });
    expect(r.valid).toBe(true);
    expect(r.minLotOk).toBe(false);
    expect(r.minLotWarning).toBeDefined();
    expect(r.minLotWarning!.excessRisk).toBeGreaterThan(0);
  });

  it("works for a short (SL above entry)", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.105, takeProfit: 1.09 });
    expect(r.valid).toBe(true);
    expect(r.slPips).toBeCloseTo(50, 6);
    expect(r.rrRatio).toBeCloseTo(2, 6);
  });

  it("synthetic: Volatility 75 uses 1.0 point size", () => {
    const r = calculateTrade({ symbol: sym("VOL75"), balance: 100, riskPercent: 10, entry: 50000, stopLoss: 49000, takeProfit: 52000 });
    expect(r.valid).toBe(true);
    expect(r.slPips).toBeCloseTo(1000, 6);
    expect(r.exactLot).toBeCloseTo(10 / 1000, 6);
  });
});

describe("floating point safety", () => {
  it("does not lose a lot step to float noise", () => {
    // 1.1 - 1.095 is 0.0050000000000000044 in IEEE 754; exact answer is 0.02 lot
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 1000, riskPercent: 1, entry: 1.1, stopLoss: 1.095, takeProfit: 1.11 });
    expect(r.recommendedLot).toBe(0.02);
  });

  it("returns clean step multiples (no 0.30000000000000004)", () => {
    const r = calculateTrade({ symbol: sym("EURUSD"), balance: 3000, riskPercent: 1, entry: 1.1, stopLoss: 1.095, takeProfit: 1.11 });
    expect(String(r.recommendedLot).length).toBeLessThanOrEqual(5);
  });
});

describe("USD-base pip value", () => {
  it("USD/JPY pip value follows the price", () => {
    const jpy = sym("USDJPY");
    expect(effectivePipValue(jpy, 150)).toBeCloseTo(1000 / 150, 6);
    expect(effectivePipValue(jpy, 100)).toBeCloseTo(10, 6);
  });

  it("USD/CHF and USD/CAD follow the price", () => {
    expect(effectivePipValue(sym("USDCHF"), 0.9)).toBeCloseTo(10 / 0.9, 6);
    expect(effectivePipValue(sym("USDCAD"), 1.35)).toBeCloseTo(10 / 1.35, 6);
  });

  it("USD-quoted forex pairs use the exact standard-lot pip value", () => {
    const eur = sym("EURUSD");
    expect(effectivePipValue(eur, 1.1)).toBe(10);
  });

  it("cross pairs use the current quote-currency conversion when supplied", () => {
    const eurgbp = sym("EURGBP");
    expect(effectivePipValue(eurgbp, 0.85, 1.27)).toBeCloseTo(12.7, 6);
    const result = calculateTrade({
      symbol: eurgbp, balance: 1000, riskPercent: 1,
      entry: 0.85, stopLoss: 0.849, takeProfit: 0.852,
      quoteCurrencyToUsdRate: 1.27,
    });
    expect(result.pipValueEstimated).toBe(false);
    expect(result.pipValuePerLot).toBeCloseTo(12.7, 6);
  });

  it("marks non-FX broker point assumptions and unconverted FX crosses as estimates", () => {
    const cross = calculateTrade({ symbol: sym("EURGBP"), balance: 1000, riskPercent: 1, entry: 0.85, stopLoss: 0.849, takeProfit: 0.852 });
    const index = calculateTrade({ symbol: sym("US30"), balance: 1000, riskPercent: 1, entry: 40000, stopLoss: 39900, takeProfit: 40200 });
    expect(cross.pipValueEstimated).toBe(true);
    expect(index.pipValueEstimated).toBe(true);
  });

  it("USD/JPY lot size reflects the live rate", () => {
    const r = calculateTrade({ symbol: sym("USDJPY"), balance: 10000, riskPercent: 1, entry: 150, stopLoss: 149.5, takeProfit: 151 });
    expect(r.valid).toBe(true);
    // 50 pips * (1000/150 = 6.667) = 333.33 per lot; $100 risk => 0.30 lot
    expect(r.recommendedLot).toBeCloseTo(0.3, 6);
    expect(r.actualLoss).toBeLessThanOrEqual(r.riskAmount + 1e-9);
  });
});
