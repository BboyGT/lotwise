import { describe, expect, it } from "vitest";
import { resolveTradeOutcome } from "@/lib/trade-outcomes";

const longTrade = {
  entry: 100,
  stopLoss: 95,
  takeProfit: 115,
  actualLoss: 10,
  actualProfit: 30,
};

describe("resolveTradeOutcome", () => {
  it("records a long win after price reaches take profit", () => {
    expect(resolveTradeOutcome(longTrade, 115)).toEqual({
      outcome: "win",
      realizedPnL: 30,
      exitPrice: 115,
    });
  });

  it("records a long loss after price reaches stop loss", () => {
    expect(resolveTradeOutcome(longTrade, 94)).toEqual({
      outcome: "loss",
      realizedPnL: -10,
      exitPrice: 94,
    });
  });

  it("handles short trades", () => {
    expect(resolveTradeOutcome({ ...longTrade, stopLoss: 105, takeProfit: 85 }, 84)).toMatchObject({
      outcome: "win",
      realizedPnL: 30,
    });
    expect(resolveTradeOutcome({ ...longTrade, stopLoss: 105, takeProfit: 85 }, 106)).toMatchObject({
      outcome: "loss",
      realizedPnL: -10,
    });
  });

  it("leaves open or invalid trades pending", () => {
    expect(resolveTradeOutcome(longTrade, 110)).toBeNull();
    expect(resolveTradeOutcome(longTrade, Number.NaN)).toBeNull();
    expect(resolveTradeOutcome({ ...longTrade, stopLoss: 105 }, 110)).toBeNull();
  });
});
