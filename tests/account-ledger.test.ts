import { describe, expect, it } from "vitest";
import { accountPnLDeltas } from "@/lib/account-ledger";

describe("account trade ledger", () => {
  const pending = { id: "trade-1", accountId: "account-100", actualLoss: 10, actualProfit: 30, outcome: "pending" as const };

  it("applies a realized result only to its owning account", () => {
    const win = { ...pending, outcome: "win" as const };
    expect(accountPnLDeltas([pending], [win])).toEqual(new Map([["account-100", 30]]));
  });

  it("does not count a repeated close event twice", () => {
    const win = { ...pending, outcome: "win" as const, realizedPnL: 30 };
    expect(accountPnLDeltas([win], [win])).toEqual(new Map());
  });

  it("reverses the old result when a closed outcome is corrected", () => {
    const win = { ...pending, outcome: "win" as const };
    const correctedLoss = { ...pending, outcome: "loss" as const };
    expect(accountPnLDeltas([win], [correctedLoss])).toEqual(new Map([["account-100", -40]]));
  });

  it("reverses realized P/L when a trade is reopened", () => {
    const win = { ...pending, outcome: "win" as const };
    expect(accountPnLDeltas([win], [pending])).toEqual(new Map([["account-100", -30]]));
  });
});
