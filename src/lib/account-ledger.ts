export interface AccountTradeResult {
  id: string;
  accountId?: string;
  actualLoss: number;
  actualProfit: number;
  outcome?: "win" | "loss" | "breakeven" | "pending";
  realizedPnL?: number;
}

export function realizedTradePnL(trade: AccountTradeResult | undefined): number {
  if (!trade || !trade.outcome || trade.outcome === "pending") return 0;
  if (Number.isFinite(trade.realizedPnL)) return trade.realizedPnL!;
  return trade.outcome === "win" ? trade.actualProfit : trade.outcome === "loss" ? -trade.actualLoss : 0;
}

/** Returns only the change in realized P/L, so duplicate outcome events are idempotent. */
export function accountPnLDeltas(
  previous: AccountTradeResult[],
  next: AccountTradeResult[]
): Map<string, number> {
  const previousById = new Map(previous.map((trade) => [trade.id, trade]));
  const deltas = new Map<string, number>();
  for (const trade of next) {
    const delta = realizedTradePnL(trade) - realizedTradePnL(previousById.get(trade.id));
    if (!delta) continue;
    const accountId = trade.accountId ?? "main";
    deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
  }
  return deltas;
}
