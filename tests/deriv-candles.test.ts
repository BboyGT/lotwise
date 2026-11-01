import { describe, expect, it } from "vitest";
import { isValidCandle, type Candle } from "@/hooks/use-deriv-candles-v2";

const valid: Candle = { time: 1_800_000_000, open: 100, high: 108, low: 96, close: 104 };

describe("Deriv candle validation", () => {
  it("accepts valid OHLC values", () => {
    expect(isValidCandle(valid)).toBe(true);
  });

  it("rejects invalid times, non-positive prices, and impossible OHLC ranges", () => {
    expect(isValidCandle({ ...valid, time: 0 })).toBe(false);
    expect(isValidCandle({ ...valid, close: Number.NaN })).toBe(false);
    expect(isValidCandle({ ...valid, low: 0 })).toBe(false);
    expect(isValidCandle({ ...valid, high: 99 })).toBe(false);
    expect(isValidCandle({ ...valid, low: 105 })).toBe(false);
  });
});
