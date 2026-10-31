export type TradeOutcome = "win" | "loss";

export interface MonitoredTrade {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  actualLoss: number;
  actualProfit: number;
}

export interface ResolvedTradeOutcome {
  outcome: TradeOutcome;
  realizedPnL: number;
  exitPrice: number;
}

/** Resolve a trade only after price has crossed its stop or target. */
export function resolveTradeOutcome(
  trade: MonitoredTrade,
  price: number
): ResolvedTradeOutcome | null {
  const values = [
    trade.entry,
    trade.stopLoss,
    trade.takeProfit,
    trade.actualLoss,
    trade.actualProfit,
    price,
  ];
  if (!values.every(Number.isFinite) || values.some((value) => value <= 0)) {
    return null;
  }

  const isLong = trade.stopLoss < trade.entry && trade.takeProfit > trade.entry;
  const isShort = trade.stopLoss > trade.entry && trade.takeProfit < trade.entry;
  if (!isLong && !isShort) return null;

  const lossHit = isLong ? price <= trade.stopLoss : price >= trade.stopLoss;
  const winHit = isLong ? price >= trade.takeProfit : price <= trade.takeProfit;
  if (lossHit) {
    return { outcome: "loss", realizedPnL: -trade.actualLoss, exitPrice: price };
  }
  if (winHit) {
    return { outcome: "win", realizedPnL: trade.actualProfit, exitPrice: price };
  }
  return null;
}
