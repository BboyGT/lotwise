// Calculator engine for trading position sizing
// Pure functions, no side effects. Easy to unit-test.

import { SymbolSpec } from "./symbols-v3";

export interface CalcInput {
  symbol: SymbolSpec;
  balance: number;       // account balance in USD
  riskPercent: number;   // % of balance willing to lose
  entry: number;
  stopLoss: number;
  takeProfit: number;
  /** USD value of one unit of the pair's quote currency, when it is not USD. */
  quoteCurrencyToUsdRate?: number;
}

export interface CalcResult {
  riskAmount: number;          // balance × risk% (the $ you're willing to lose)
  slDistance: number;         // |entry - sl|
  tpDistance: number;         // |entry - tp|
  slPips: number;             // slDistance / pipSize
  tpPips: number;             // tpDistance / pipSize
  exactLot: number;           // raw computed lot size
  recommendedLot: number;     // rounded down to lot step
  actualLoss: number;         // loss at recommendedLot (should match risk)
  actualProfit: number;        // profit at recommendedLot
  rrRatio: number;             // tp / sl ratio
  pipValuePerLot: number;      // pip/point value used in USD per catalog lot
  pipValueEstimated: boolean; // true when a live FX conversion or broker spec is unavailable
  minLotOk: boolean;           // does recommendedLot >= symbol.minLot?
  minLotWarning?: {
    minLot: number;
    lossAtMinLot: number;      // actual $ loss if forced to use min lot
    profitAtMinLot: number;
    excessRisk: number;        // how much over your risk budget
    excessRiskPercent: number; // % over your balance
  };
  valid: boolean;
  errors: string[];
}

/**
 * Effective pip value per catalog lot in USD. FX pip values are denominated
 * in the pair's quote currency, so convert them using the live quote-to-USD
 * rate. USD-base pairs can derive that conversion from their entry price.
 */
export function effectivePipValue(
  symbol: SymbolSpec,
  entry: number,
  quoteCurrencyToUsdRate?: number,
): number {
  if (symbol.assetClass === "forex") {
    const quoteCurrency = symbol.id.slice(-3);
    const conversion = quoteCurrency === "USD"
      ? 1
      : quoteCurrencyToUsdRate ?? (symbol.id.startsWith("USD") && entry > 0 ? 1 / entry : undefined);
    if (conversion != null && Number.isFinite(conversion) && conversion > 0) {
      return symbol.pipSize * symbol.contractSize * conversion;
    }
  }
  return symbol.pipValuePerLot;
}

export function calculateTrade(input: CalcInput): CalcResult {
  const errors: string[] = [];
  const { symbol, balance, riskPercent, entry, stopLoss, takeProfit } = input;

  if (!(balance > 0)) errors.push("Account balance must be greater than 0");
  if (!(riskPercent > 0 && riskPercent <= 100))
    errors.push("Risk % must be between 0 and 100");
  if (!(entry > 0)) errors.push("Entry price must be greater than 0");
  if (!(stopLoss > 0)) errors.push("Stop loss must be greater than 0");
  if (!(takeProfit > 0)) errors.push("Take profit must be greater than 0");

  if (
    entry > 0 &&
    stopLoss > 0 &&
    Math.abs(entry - stopLoss) < 1e-9
  )
    errors.push("Stop loss cannot equal entry price");
  if (
    entry > 0 &&
    takeProfit > 0 &&
    Math.abs(entry - takeProfit) < 1e-9
  )
    errors.push("Take profit cannot equal entry price");

  if (errors.length > 0) {
    return {
      riskAmount: 0,
      slDistance: 0,
      tpDistance: 0,
      slPips: 0,
      tpPips: 0,
      exactLot: 0,
      recommendedLot: 0,
      actualLoss: 0,
      actualProfit: 0,
      rrRatio: 0,
      pipValuePerLot: 0,
      pipValueEstimated: false,
      minLotOk: false,
      valid: false,
      errors,
    };
  }

  // Direction: long if SL below entry, short if above
  const isLong = stopLoss < entry;
  const slDistance = Math.abs(entry - stopLoss);
  const tpDistance = Math.abs(entry - takeProfit);

  // Direction sanity check (TP must be on the correct side)
  if (isLong && takeProfit <= entry) {
    errors.push("For a long (SL below entry), TP must be above entry");
  }
  if (!isLong && takeProfit >= entry) {
    errors.push("For a short (SL above entry), TP must be below entry");
  }

  if (errors.length > 0) {
    return {
      riskAmount: 0,
      slDistance,
      tpDistance,
      slPips: 0,
      tpPips: 0,
      exactLot: 0,
      recommendedLot: 0,
      actualLoss: 0,
      actualProfit: 0,
      rrRatio: 0,
      pipValuePerLot: 0,
      pipValueEstimated: false,
      minLotOk: false,
      valid: false,
      errors,
    };
  }

  const pipValue = effectivePipValue(symbol, entry, input.quoteCurrencyToUsdRate);
  const quoteCurrency = symbol.id.slice(-3);
  const hasLiveFxConversion = symbol.assetClass === "forex" && (
    quoteCurrency === "USD" ||
    (symbol.id.startsWith("USD") && entry > 0) ||
    (input.quoteCurrencyToUsdRate != null && Number.isFinite(input.quoteCurrencyToUsdRate))
  );
  const pipValueEstimated = symbol.assetClass !== "forex" || !hasLiveFxConversion;
  const slPips = slDistance / symbol.pipSize;
  const tpPips = tpDistance / symbol.pipSize;

  // risk amount in $
  const riskAmount = (balance * riskPercent) / 100;

  // Loss formula: loss$ = slPips × pipValue × lot
  // Solve for lot: lot = riskAmount / (slPips × pipValue)
  // Guard against division by 0
  const lossPerLot = slPips * pipValue;
  const exactLot = lossPerLot > 0 ? riskAmount / lossPerLot : 0;

  // Round down to nearest lot step
  // The epsilon absorbs floating point noise (e.g. 1.1 - 1.095 = 0.0050000000000000044)
  // that would otherwise push an exact multiple of the step down by a whole step.
  const stepCount = exactLot / symbol.lotStep;
  const roundingTolerance = Math.max(
    1e-12,
    Number.EPSILON * Math.max(1, Math.abs(stepCount)) * 4
  );
  const steps = Math.floor(stepCount + roundingTolerance);
  const recommendedLot = Number((steps * symbol.lotStep).toFixed(8));

  // Actual $ amounts at recommended lot
  const actualLoss = slPips * pipValue * recommendedLot;
  const actualProfit = tpPips * pipValue * recommendedLot;

  // R:R ratio
  const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  // Min lot check
  const minLotOk = recommendedLot >= symbol.minLot;
  const minLotWarning = !minLotOk
    ? {
        minLot: symbol.minLot,
        lossAtMinLot: slPips * pipValue * symbol.minLot,
        profitAtMinLot: tpPips * pipValue * symbol.minLot,
        excessRisk:
          slPips * pipValue * symbol.minLot - riskAmount,
        excessRiskPercent:
          (slPips * pipValue * symbol.minLot - riskAmount) /
          (balance || 1) *
          100,
      }
    : undefined;

  return {
    riskAmount,
    slDistance,
    tpDistance,
    slPips,
    tpPips,
    exactLot,
    recommendedLot,
    actualLoss,
    actualProfit,
    rrRatio,
    pipValuePerLot: pipValue,
    pipValueEstimated,
    minLotOk,
    minLotWarning,
    valid: true,
    errors: [],
  };
}

// Formatting helpers
export function formatMoney(n: number, currency: string = "USD"): string {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${currencySymbol(currency)}${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLot(n: number): string {
  if (!isFinite(n) || n === 0) return "0.00";
  return n.toFixed(2);
}

export function formatPrice(n: number, decimals: number = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    JPY: "¥",
  };
  return map[currency] ?? currency + " ";
}

// Approximate FX rates relative to USD (user-facing display only)
// In a real production app this would come from a live rates API
export const FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  JPY: 149,
};
