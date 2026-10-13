// Symbol catalog with lot specs and pip/point value rules
// All values standard for retail brokers (Deriv, Exness, ICMarkets, Binance etc.)

export type AssetClass = "forex" | "synthetic" | "indices" | "crypto";

export interface SymbolSpec {
  id: string;
  label: string;
  tvSymbol: string;          // TradingView ticker
  assetClass: AssetClass;
  minLot: number;            // broker minimum lot size
  lotStep: number;           // broker lot step
  contractSize: number;      // units per 1 lot
  pipSize: number;           // 0.0001 for forex, 0.01 for JPY pairs, 1.0 for indices/crypto
  pipValuePerLot: number;    // $ per pip per 1 lot (in account currency = USD)
  decimals: number;          // price display decimals
  note?: string;             // special notes
}

export const ASSET_CLASSES: {
  id: AssetClass;
  label: string;
  short: string;
  description: string;
}[] = [
  { id: "forex", label: "Forex", short: "FX", description: "Major currency pairs" },
  { id: "synthetic", label: "Synthetic", short: "SYN", description: "Boom & Crash indices" },
  { id: "indices", label: "Indices", short: "IDX", description: "Real-world stock indices" },
  { id: "crypto", label: "Crypto", short: "CRY", description: "Top cryptocurrencies" },
];

export const SYMBOLS: SymbolSpec[] = [
  // ---------- FOREX ----------
  {
    id: "EURUSD",
    label: "EUR/USD",
    tvSymbol: "FX:EURUSD",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.0001,
    pipValuePerLot: 10, // 1 pip = $10 per 1 lot for USD-quote
    decimals: 5,
  },
  {
    id: "GBPUSD",
    label: "GBP/USD",
    tvSymbol: "FX:GBPUSD",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.0001,
    pipValuePerLot: 10,
    decimals: 5,
  },
  {
    id: "USDJPY",
    label: "USD/JPY",
    tvSymbol: "FX:USDJPY",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.01,
    pipValuePerLot: 9.13, // approx, depends on USDJPY rate; updated dynamically
    decimals: 3,
    note: "Pip value varies with USDJPY rate. Approximate value used.",
  },
  {
    id: "AUDUSD",
    label: "AUD/USD",
    tvSymbol: "FX:AUDUSD",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.0001,
    pipValuePerLot: 10,
    decimals: 5,
  },
  {
    id: "USDCHF",
    label: "USD/CHF",
    tvSymbol: "FX:USDCHF",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.0001,
    pipValuePerLot: 11.3,
    decimals: 5,
    note: "Pip value varies with USDCHF rate. Approximate value used.",
  },
  {
    id: "USDCAD",
    label: "USD/CAD",
    tvSymbol: "FX:USDCAD",
    assetClass: "forex",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize: 0.0001,
    pipValuePerLot: 7.45,
    decimals: 5,
    note: "Pip value varies with USDCAD rate. Approximate value used.",
  },

  // ---------- SYNTHETIC (Deriv-style) ----------
  // Pip size set to 1.0 (= 1 price unit) for friendly display.
  // Deriv's contract spec: 1 lot ≈ $1 per 1.0 price move (per 1000 ticks of 0.001).
  // Treating 1.0 price unit as "1 pip" gives realistic, readable numbers.
  {
    id: "BOOM500",
    label: "Boom 500",
    tvSymbol: "DERIV:BOOM500",
    assetClass: "synthetic",
    minLot: 0.2,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1, // $1 per 1.0 price move per 1 lot
    decimals: 2,
    note: "Deriv synthetic. Min lot 0.20. Pays on bullish spikes. $1/point/lot.",
  },
  {
    id: "BOOM1000",
    label: "Boom 1000",
    tvSymbol: "DERIV:BOOM1000",
    assetClass: "synthetic",
    minLot: 0.2,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 2,
    note: "Deriv synthetic. Min lot 0.20. Pays on bullish spikes. $1/point/lot.",
  },
  {
    id: "CRASH500",
    label: "Crash 500",
    tvSymbol: "DERIV:CRASH500",
    assetClass: "synthetic",
    minLot: 0.2,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 2,
    note: "Deriv synthetic. Min lot 0.20. Pays on bearish drops. $1/point/lot.",
  },
  {
    id: "CRASH1000",
    label: "Crash 1000",
    tvSymbol: "DERIV:CRASH1000",
    assetClass: "synthetic",
    minLot: 0.2,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 2,
    note: "Deriv synthetic. Min lot 0.20. Pays on bearish drops. $1/point/lot.",
  },

  // ---------- REAL INDICES ----------
  {
    id: "US30",
    label: "US30 (Dow Jones)",
    tvSymbol: "TVC:US30",
    assetClass: "indices",
    minLot: 0.1,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1, // $1 per point per lot
    decimals: 1,
  },
  {
    id: "NAS100",
    label: "NAS100 (Nasdaq)",
    tvSymbol: "TVC:NAS100",
    assetClass: "indices",
    minLot: 0.1,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 1,
  },
  {
    id: "SPX500",
    label: "S&P 500",
    tvSymbol: "TVC:SPX",
    assetClass: "indices",
    minLot: 0.1,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.1,
    pipValuePerLot: 1,
    decimals: 2,
  },
  {
    id: "GER40",
    label: "GER40 (DAX)",
    tvSymbol: "TVC:DAX",
    assetClass: "indices",
    minLot: 0.1,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.1,
    pipValuePerLot: 1,
    decimals: 2,
  },
  {
    id: "UK100",
    label: "UK100 (FTSE)",
    tvSymbol: "TVC:UKX",
    assetClass: "indices",
    minLot: 0.1,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.1,
    pipValuePerLot: 1,
    decimals: 2,
  },

  // ---------- CRYPTO ----------
  {
    id: "BTCUSD",
    label: "BTC/USD",
    tvSymbol: "BINANCE:BTCUSDT",
    assetClass: "crypto",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1, // $1 per $1 move per 1 coin
    decimals: 2,
  },
  {
    id: "ETHUSD",
    label: "ETH/USD",
    tvSymbol: "BINANCE:ETHUSDT",
    assetClass: "crypto",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.1,
    pipValuePerLot: 0.1,
    decimals: 2,
  },
  {
    id: "XRPUSD",
    label: "XRP/USD",
    tvSymbol: "BINANCE:XRPUSDT",
    assetClass: "crypto",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.0001,
    pipValuePerLot: 0.0001,
    decimals: 4,
  },
  {
    id: "SOLUSD",
    label: "SOL/USD",
    tvSymbol: "BINANCE:SOLUSDT",
    assetClass: "crypto",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 0.01,
    pipValuePerLot: 0.01,
    decimals: 3,
  },
];

export function symbolsByClass(assetClass: AssetClass): SymbolSpec[] {
  return SYMBOLS.filter((s) => s.assetClass === assetClass);
}

export function getSymbol(id: string): SymbolSpec {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[0];
}
