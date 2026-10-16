// Symbol catalog with lot specs and pip/point value rules
// All values standard for retail brokers (Deriv, Exness, ICMarkets, Binance etc.)

export type AssetClass = "forex" | "synthetic" | "indices" | "crypto";

export interface SymbolSpec {
  id: string;
  label: string;
  tvSymbol: string;          // TradingView ticker (best-effort — TV doesn't list all Deriv synthetics)
  derivSymbol?: string;      // Deriv API symbol for live ticks (synthetic only)
  binanceSymbol?: string;   // Binance API symbol (crypto only — e.g. BTCUSDT)
  tvScannerSymbol?: string; // TradingView scanner symbol for live price (forex/indices only — e.g. "FX:EURUSD")
  assetClass: AssetClass;
  category: string;          // sub-category within asset class, for grouped dropdown
  minLot: number;            // broker minimum lot size
  lotStep: number;           // broker lot step
  contractSize: number;      // units per 1 lot
  pipSize: number;           // 0.0001 for forex, 0.01 for JPY pairs, 1.0 for indices/crypto/synthetic
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
  { id: "forex", label: "Forex", short: "FX", description: "Major, cross & exotic currency pairs" },
  { id: "synthetic", label: "Synthetic", short: "SYN", description: "Boom, Crash, Volatility, Jump, Step & more" },
  { id: "indices", label: "Indices", short: "IDX", description: "US, Europe, Asia & volatility indices" },
  { id: "crypto", label: "Crypto", short: "CRY", description: "Major & alt cryptocurrencies" },
];

// ---------------------------------------------------------------------------
// Helper to keep synthetic specs compact.
// Deriv synthetic indices: $1 per 1.0 price move per 1 lot. Pip size = 1.0
// for readable display ("X points" instead of "X000.0 pips").
// ---------------------------------------------------------------------------
function synth(
  id: string,
  label: string,
  tvSymbol: string,
  derivSymbol: string,
  category: string,
  minLot: number,
  note?: string
): SymbolSpec {
  return {
    id,
    label,
    tvSymbol,
    derivSymbol,
    assetClass: "synthetic",
    category,
    minLot,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 2,
    note,
  };
}

function forex(
  id: string,
  label: string,
  tvSymbol: string,
  tvScannerSymbol: string,
  category: string,
  pipValuePerLot: number,
  decimals: number,
  pipSize: number = 0.0001,
  note?: string
): SymbolSpec {
  return {
    id,
    label,
    tvSymbol,
    tvScannerSymbol,
    assetClass: "forex",
    category,
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 100_000,
    pipSize,
    pipValuePerLot,
    decimals,
    note,
  };
}

function index(
  id: string,
  label: string,
  tvSymbol: string,
  tvScannerSymbol: string,
  category: string,
  pipValuePerLot: number = 1,
  pipSize: number = 1,
  decimals: number = 1,
  minLot: number = 0.1,
  note?: string
): SymbolSpec {
  return {
    id,
    label,
    tvSymbol,
    tvScannerSymbol,
    assetClass: "indices",
    category,
    minLot,
    lotStep: 0.01,
    contractSize: 1,
    pipSize,
    pipValuePerLot,
    decimals,
    note,
  };
}

function crypto(
  id: string,
  label: string,
  tvSymbol: string,
  binanceSymbol: string,
  category: string,
  pipSize: number,
  pipValuePerLot: number,
  decimals: number,
  note?: string
): SymbolSpec {
  return {
    id,
    label,
    tvSymbol,
    binanceSymbol,
    assetClass: "crypto",
    category,
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize,
    pipValuePerLot,
    decimals,
    note,
  };
}

export const SYMBOLS: SymbolSpec[] = [
  // ============================================================
  // FOREX — MAJORS (7)
  // ============================================================
  forex("EURUSD", "EUR/USD", "FX:EURUSD", "FX:EURUSD", "Majors", 10, 5),
  forex("GBPUSD", "GBP/USD", "FX:GBPUSD", "FX:GBPUSD", "Majors", 10, 5),
  forex("USDJPY", "USD/JPY", "FX:USDJPY", "FX:USDJPY", "Majors", 9.13, 3, 0.01, "Pip value varies with USDJPY rate. Approximate."),
  forex("USDCHF", "USD/CHF", "FX:USDCHF", "FX:USDCHF", "Majors", 11.3, 5, 0.0001, "Pip value varies with USDCHF rate."),
  forex("USDCAD", "USD/CAD", "FX:USDCAD", "FX:USDCAD", "Majors", 7.45, 5, 0.0001, "Pip value varies with USDCAD rate."),
  forex("AUDUSD", "AUD/USD", "FX:AUDUSD", "FX:AUDUSD", "Majors", 10, 5),
  forex("NZDUSD", "NZD/USD", "FX:NZDUSD", "FX:NZDUSD", "Majors", 10, 5),

  // ============================================================
  // FOREX — EUR CROSSES (6)
  // ============================================================
  forex("EURGBP", "EUR/GBP", "FX:EURGBP", "FX:EURGBP", "EUR Crosses", 12.7, 5),
  forex("EURJPY", "EUR/JPY", "FX:EURJPY", "FX:EURJPY", "EUR Crosses", 6.55, 3, 0.01),
  forex("EURCHF", "EUR/CHF", "FX:EURCHF", "FX:EURCHF", "EUR Crosses", 11.3, 5),
  forex("EURAUD", "EUR/AUD", "FX:EURAUD", "FX:EURAUD", "EUR Crosses", 6.45, 5),
  forex("EURCAD", "EUR/CAD", "FX:EURCAD", "FX:EURCAD", "EUR Crosses", 7.45, 5),
  forex("EURNZD", "EUR/NZD", "FX:EURNZD", "FX:EURNZD", "EUR Crosses", 6.10, 5),

  // ============================================================
  // FOREX — GBP CROSSES (5)
  // ============================================================
  forex("GBPJPY", "GBP/JPY", "FX:GBPJPY", "FX:GBPJPY", "GBP Crosses", 6.55, 3, 0.01),
  forex("GBPCHF", "GBP/CHF", "FX:GBPCHF", "FX:GBPCHF", "GBP Crosses", 11.3, 5),
  forex("GBPAUD", "GBP/AUD", "FX:GBPAUD", "FX:GBPAUD", "GBP Crosses", 6.45, 5),
  forex("GBPCAD", "GBP/CAD", "FX:GBPCAD", "FX:GBPCAD", "GBP Crosses", 7.45, 5),
  forex("GBPNZD", "GBP/NZD", "FX:GBPNZD", "FX:GBPNZD", "GBP Crosses", 6.10, 5),

  // ============================================================
  // FOREX — AUD CROSSES (4)
  // ============================================================
  forex("AUDJPY", "AUD/JPY", "FX:AUDJPY", "FX:AUDJPY", "AUD Crosses", 6.55, 3, 0.01),
  forex("AUDCHF", "AUD/CHF", "FX:AUDCHF", "FX:AUDCHF", "AUD Crosses", 11.3, 5),
  forex("AUDCAD", "AUD/CAD", "FX:AUDCAD", "FX:AUDCAD", "AUD Crosses", 7.45, 5),
  forex("AUDNZD", "AUD/NZD", "FX:AUDNZD", "FX:AUDNZD", "AUD Crosses", 6.10, 5),

  // ============================================================
  // FOREX — NZD & OTHER CROSSES (5)
  // ============================================================
  forex("NZDJPY", "NZD/JPY", "FX:NZDJPY", "FX:NZDJPY", "NZD Crosses", 6.55, 3, 0.01),
  forex("NZDCHF", "NZD/CHF", "FX:NZDCHF", "FX:NZDCHF", "NZD Crosses", 11.3, 5),
  forex("NZDCAD", "NZD/CAD", "FX:NZDCAD", "FX:NZDCAD", "NZD Crosses", 7.45, 5),
  forex("CHFJPY", "CHF/JPY", "FX:CHFJPY", "FX:CHFJPY", "Other Crosses", 6.55, 3, 0.01),
  forex("CADJPY", "CAD/JPY", "FX:CADJPY", "FX:CADJPY", "Other Crosses", 6.55, 3, 0.01),

  // ============================================================
  // FOREX — EXOTICS (8)
  // ============================================================
  forex("USDMXN", "USD/MXN", "FX:USDMXN", "FX:USDMXN", "Exotics", 5.0, 4, 0.0001, "Mexican Peso. High volatility."),
  forex("USDZAR", "USD/ZAR", "FX:USDZAR", "FX:USDZAR", "Exotics", 5.5, 4, 0.0001, "South African Rand. High volatility."),
  forex("USDTRY", "USD/TRY", "FX:USDTRY", "FX:USDTRY", "Exotics", 3.0, 4, 0.0001, "Turkish Lira. Very high volatility."),
  forex("USDSGD", "USD/SGD", "FX:USDSGD", "OANDA:USDSGD", "Exotics", 7.45, 5),
  forex("USDHKD", "USD/HKD", "FX:USDHKD", "FX:USDHKD", "Exotics", 1.28, 5),
  forex("USDSEK", "USD/SEK", "FX:USDSEK", "FX:USDSEK", "Exotics", 9.7, 4, 0.0001),
  forex("USDNOK", "USD/NOK", "FX:USDNOK", "FX:USDNOK", "Exotics", 9.5, 4, 0.0001),
  forex("USDDKK", "USD/DKK", "FX:USDDKK", "FX:USDDKK", "Exotics", 14.6, 5),

  // ============================================================
  // SYNTHETIC — BOOM & CRASH (10)
  // ============================================================
  synth("BOOM300", "Boom 300", "DERIV:BOOM_300", "BOOM300N", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bullish spike per 300 ticks (most frequent)."),
  synth("BOOM500", "Boom 500", "DERIV:BOOM_500", "BOOM500", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bullish spike per 500 ticks."),
  synth("BOOM600", "Boom 600", "DERIV:BOOM_600", "BOOM600", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bullish spike per 600 ticks."),
  synth("BOOM900", "Boom 900", "DERIV:BOOM_900", "BOOM900", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bullish spike per 900 ticks."),
  synth("BOOM1000", "Boom 1000", "DERIV:BOOM_1000", "BOOM1000", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bullish spike per 1000 ticks."),
  synth("CRASH300", "Crash 300", "DERIV:CRASH_300", "CRASH300N", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bearish drop per 300 ticks (most frequent)."),
  synth("CRASH500", "Crash 500", "DERIV:CRASH_500", "CRASH500", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bearish drop per 500 ticks."),
  synth("CRASH600", "Crash 600", "DERIV:CRASH_600", "CRASH600", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bearish drop per 600 ticks."),
  synth("CRASH900", "Crash 900", "DERIV:CRASH_900", "CRASH900", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bearish drop per 900 ticks."),
  synth("CRASH1000", "Crash 1000", "DERIV:CRASH_1000", "CRASH1000", "Boom & Crash", 0.2,
    "Deriv. Min lot 0.20. Avg 1 bearish drop per 1000 ticks."),

  // ============================================================
  // SYNTHETIC — VOLATILITY INDICES (5)
  // ============================================================
  synth("VOL10", "Volatility 10 Index", "DERIV:R_10", "R_10", "Volatility Indices", 0.01,
    "Deriv. 1 tick/pip ≈ $1/lot. 10% volatility."),
  synth("VOL25", "Volatility 25 Index", "DERIV:R_25", "R_25", "Volatility Indices", 0.01,
    "Deriv. 25% volatility."),
  synth("VOL50", "Volatility 50 Index", "DERIV:R_50", "R_50", "Volatility Indices", 0.01,
    "Deriv. 50% volatility."),
  synth("VOL75", "Volatility 75 Index", "DERIV:R_75", "R_75", "Volatility Indices", 0.01,
    "Deriv. 75% volatility. Most popular."),
  synth("VOL100", "Volatility 100 Index", "DERIV:R_100", "R_100", "Volatility Indices", 0.01,
    "Deriv. 100% volatility. Highest volatility."),

  // ============================================================
  // SYNTHETIC — VOLATILITY 1s INDICES (8)
  // ============================================================
  synth("VOL10S", "Volatility 10 (1s) Index", "DERIV:1HZ_10V", "1HZ10V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second."),
  synth("VOL15S", "Volatility 15 (1s) Index", "DERIV:1HZ_15V", "1HZ15V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second. 15% volatility."),
  synth("VOL25S", "Volatility 25 (1s) Index", "DERIV:1HZ_25V", "1HZ25V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second."),
  synth("VOL30S", "Volatility 30 (1s) Index", "DERIV:1HZ_30V", "1HZ30V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second. 30% volatility."),
  synth("VOL50S", "Volatility 50 (1s) Index", "DERIV:1HZ_50V", "1HZ50V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second."),
  synth("VOL75S", "Volatility 75 (1s) Index", "DERIV:1HZ_75V", "1HZ75V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second."),
  synth("VOL90S", "Volatility 90 (1s) Index", "DERIV:1HZ_90V", "1HZ90V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second. 90% volatility."),
  synth("VOL100S", "Volatility 100 (1s) Index", "DERIV:1HZ_100V", "1HZ100V", "Volatility 1s", 0.01,
    "Deriv. Generates 1 tick per second."),

  // ============================================================
  // SYNTHETIC — JUMP INDICES (5)
  // ============================================================
  synth("JUMP10", "Jump 10 Index", "DERIV:JD_10", "JD10", "Jump Indices", 0.01,
    "Deriv. Jump index — 10% volatility with jumps."),
  synth("JUMP25", "Jump 25 Index", "DERIV:JD_25", "JD25", "Jump Indices", 0.01,
    "Deriv. Jump index — 25% volatility."),
  synth("JUMP50", "Jump 50 Index", "DERIV:JD_50", "JD50", "Jump Indices", 0.01,
    "Deriv. Jump index — 50% volatility."),
  synth("JUMP75", "Jump 75 Index", "DERIV:JD_75", "JD75", "Jump Indices", 0.01,
    "Deriv. Jump index — 75% volatility."),
  synth("JUMP100", "Jump 100 Index", "DERIV:JD_100", "JD100", "Jump Indices", 0.01,
    "Deriv. Jump index — 100% volatility."),

  // ============================================================
  // SYNTHETIC — STEP INDICES (9)
  // ============================================================
  synth("STEP01", "Step Index (0.1)", "DERIV:STPIDX_0P1", "stpidx0p1", "Step Indices", 0.1,
    "Deriv. Step size 0.1. Uniform distribution."),
  synth("STEP02", "Step Index (0.2)", "DERIV:STPIDX_0P2", "stpidx0p2", "Step Indices", 0.1,
    "Deriv. Step size 0.2."),
  synth("STEP03", "Step Index (0.3)", "DERIV:STPIDX_0P3", "stpidx0p3", "Step Indices", 0.1,
    "Deriv. Step size 0.3."),
  synth("STEP04", "Step Index (0.4)", "DERIV:STPIDX_0P4", "stpidx0p4", "Step Indices", 0.1,
    "Deriv. Step size 0.4."),
  synth("STEP05", "Step Index (0.5)", "DERIV:STPIDX_0P5", "stpidx0p5", "Step Indices", 0.1,
    "Deriv. Step size 0.5."),
  synth("STEP06", "Step Index (0.6)", "DERIV:STPIDX_0P6", "stpidx0p6", "Step Indices", 0.1,
    "Deriv. Step size 0.6."),
  synth("STEP07", "Step Index (0.7)", "DERIV:STPIDX_0P7", "stpidx0p7", "Step Indices", 0.1,
    "Deriv. Step size 0.7."),
  synth("STEP08", "Step Index (0.8)", "DERIV:STPIDX_0P8", "stpidx0p8", "Step Indices", 0.1,
    "Deriv. Step size 0.8."),
  synth("STEP09", "Step Index (0.9)", "DERIV:STPIDX_0P9", "stpidx0p9", "Step Indices", 0.1,
    "Deriv. Step size 0.9."),
  synth("STEP200", "Step Index (200)", "DERIV:STPIDX_200", "stpidx200", "Step Indices", 0.1,
    "Deriv. Step size 200."),
  synth("STEP300", "Step Index (300)", "DERIV:STPIDX_300", "stpidx300", "Step Indices", 0.1,
    "Deriv. Step size 300."),
  synth("STEP400", "Step Index (400)", "DERIV:STPIDX_400", "stpidx400", "Step Indices", 0.1,
    "Deriv. Step size 400."),
  synth("STEP500", "Step Index (500)", "DERIV:STPIDX_500", "stpidx500", "Step Indices", 0.1,
    "Deriv. Step size 500."),

  // ============================================================
  // SYNTHETIC — BULL, BEAR, Z & SMART INDICES
  // ============================================================
  synth("BULLMARKET", "Bull Market Index", "DERIV:RD_BULL", "RDBULL", "Bull/Bear/Smart", 0.01,
    "Deriv. Simulates bullish market behaviour."),
  synth("BEARMARKET", "Bear Market Index", "DERIV:RD_BEAR", "RDBEAR", "Bull/Bear/Smart", 0.01,
    "Deriv. Simulates bearish market behaviour."),
  synth("ZVOL75", "Z Volatility 75 Index", "DERIV:Z_VOLATILITY_75", "ZVOLATILITY75", "Bull/Bear/Smart", 0.01,
    "Deriv. Stable volatility variant."),
  synth("SMART5R", "Smart 5R Index", "DERIV:SMART_5R", "smartidx5R", "Bull/Bear/Smart", 0.01,
    "Deriv. 5 resets per cycle."),
  synth("SMART10R", "Smart 10R Index", "DERIV:SMART_10R", "smartidx10R", "Bull/Bear/Smart", 0.01,
    "Deriv. 10 resets per cycle."),
  synth("SMART20R", "Smart 20R Index", "DERIV:SMART_20R", "smartidx20R", "Bull/Bear/Smart", 0.01,
    "Deriv. 20 resets per cycle."),
  synth("SMART40R", "Smart 40R Index", "DERIV:SMART_40R", "smartidx40R", "Bull/Bear/Smart", 0.01,
    "Deriv. 40 resets per cycle."),

  // ============================================================
  // INDICES — US (4)
  // ============================================================
  index("US30", "US30 (Dow Jones)", "TVC:US30", "DJ:DJI", "US Indices", 1, 1, 1, 0.1),
  index("NAS100", "NAS100 (Nasdaq 100)", "TVC:NAS100", "NASDAQ:NDX", "US Indices", 1, 1, 1, 0.1),
  index("SPX500", "S&P 500", "TVC:SPX", "SP:SPX", "US Indices", 1, 0.1, 2, 0.1),
  index("US2000", "Russell 2000", "TVC:RUT", "TVC:RUT", "US Indices", 1, 1, 1, 0.1,
    "US small-cap index."),

  // ============================================================
  // INDICES — EUROPE (7)
  // ============================================================
  index("GER40", "GER40 (DAX)", "TVC:DAX", "XETR:DAX", "Europe Indices", 1, 0.1, 2, 0.1),
  index("UK100", "UK100 (FTSE)", "TVC:UKX", "TVC:UKX", "Europe Indices", 1, 0.1, 2, 0.1),
  index("FRA40", "FRA40 (CAC 40)", "TVC:CAC", "EURONEXT:PX1", "Europe Indices", 1, 0.1, 2, 0.1),
  index("ESP35", "ESP35 (IBEX 35)", "TVC:IBEX35", "TVC:IBEX35", "Europe Indices", 1, 1, 1, 0.1),
  index("ITA40", "ITA40 (FTSE MIB)", "TVC:FTSEMIB", "MIL:FTSEMIB", "Europe Indices", 1, 1, 1, 0.1),
  index("NETH25", "NETH25 (AEX)", "TVC:AEX", "TVC:AEX", "Europe Indices", 1, 1, 1, 0.1),
  index("SWISS20", "SWISS20 (SMI)", "TVC:SMI", "SIX:SMI", "Europe Indices", 1, 1, 1, 0.1),

  // ============================================================
  // INDICES — ASIA-PACIFIC (4)
  // ============================================================
  index("JPN225", "JPN225 (Nikkei)", "TVC:NI225", "TVC:NI225", "Asia Indices", 1, 1, 1, 0.1),
  index("HKG50", "HKG50 (Hang Seng)", "TVC:HSI", "TVC:HSI", "Asia Indices", 1, 1, 1, 0.1),
  index("AUS200", "AUS200 (ASX)", "TVC:ASX200", "ASX:AXJO", "Asia Indices", 1, 1, 1, 0.1),
  index("KOSPI200", "KOSPI 200", "TVC:KS200", "TVC:KS200", "Asia Indices", 1, 1, 1, 0.1,
    "South Korea index."),

  // ============================================================
  // INDICES — VOLATILITY INDEX (1)
  // ============================================================
  index("VIX", "CBOE Volatility Index (VIX)", "TVC:VIX", "TVC:VIX", "Volatility Index", 1, 0.01, 2, 0.1,
    "Fear gauge — measures S&P 500 implied volatility."),

  // ============================================================
  // CRYPTO — MAJOR (8)
  // ============================================================
  crypto("BTCUSD", "BTC/USD", "BINANCE:BTCUSDT", "BTCUSDT", "Major", 1, 1, 2,
    "Bitcoin. $1 per $1 move per 1 coin (1 lot = 1 BTC)."),
  crypto("ETHUSD", "ETH/USD", "BINANCE:ETHUSDT", "ETHUSDT", "Major", 0.1, 0.1, 2,
    "Ethereum. 1 lot = 1 ETH."),
  crypto("XRPUSD", "XRP/USD", "BINANCE:XRPUSDT", "XRPUSDT", "Major", 0.0001, 0.0001, 4,
    "Ripple. 1 lot = 1 XRP."),
  crypto("SOLUSD", "SOL/USD", "BINANCE:SOLUSDT", "SOLUSDT", "Major", 0.01, 0.01, 3,
    "Solana. 1 lot = 1 SOL."),
  crypto("ADAUSD", "ADA/USD", "BINANCE:ADAUSDT", "ADAUSDT", "Major", 0.0001, 0.0001, 4,
    "Cardano. 1 lot = 1 ADA."),
  crypto("DOTUSD", "DOT/USD", "BINANCE:DOTUSDT", "DOTUSDT", "Major", 0.01, 0.01, 3,
    "Polkadot. 1 lot = 1 DOT."),
  crypto("LTCUSD", "LTC/USD", "BINANCE:LTCUSDT", "LTCUSDT", "Major", 0.01, 0.01, 2,
    "Litecoin. 1 lot = 1 LTC."),
  crypto("BCHUSD", "BCH/USD", "BINANCE:BCHUSDT", "BCHUSDT", "Major", 0.01, 0.01, 2,
    "Bitcoin Cash. 1 lot = 1 BCH."),

  // ============================================================
  // CRYPTO — LAYER 1 & 2 (10)
  // ============================================================
  crypto("AVAXUSD", "AVAX/USD", "BINANCE:AVAXUSDT", "AVAXUSDT", "Layer 1 & 2", 0.01, 0.01, 3,
    "Avalanche. 1 lot = 1 AVAX."),
  crypto("ATOMUSD", "ATOM/USD", "BINANCE:ATOMUSDT", "ATOMUSDT", "Layer 1 & 2", 0.001, 0.001, 3,
    "Cosmos. 1 lot = 1 ATOM."),
  crypto("NEARUSD", "NEAR/USD", "BINANCE:NEARUSDT", "NEARUSDT", "Layer 1 & 2", 0.01, 0.01, 3,
    "NEAR Protocol. 1 lot = 1 NEAR."),
  crypto("ARBUSD", "ARB/USD", "BINANCE:ARBUSDT", "ARBUSDT", "Layer 1 & 2", 0.001, 0.001, 4,
    "Arbitrum. 1 lot = 1 ARB."),
  crypto("OPUSD", "OP/USD", "BINANCE:OPUSDT", "OPUSDT", "Layer 1 & 2", 0.001, 0.001, 4,
    "Optimism. 1 lot = 1 OP."),
  crypto("APTUSD", "APT/USD", "BINANCE:APTUSDT", "APTUSDT", "Layer 1 & 2", 0.001, 0.001, 4,
    "Aptos. 1 lot = 1 APT."),
  crypto("MATICUSD", "MATIC/USD (POL)", "BINANCE:POLUSDT", "POLUSDT", "Layer 1 & 2", 0.0001, 0.0001, 4,
    "Polygon (now POL). 1 lot = 1 POL."),
  crypto("FILUSD", "FIL/USD", "BINANCE:FILUSDT", "FILUSDT", "Layer 1 & 2", 0.01, 0.01, 3,
    "Filecoin. 1 lot = 1 FIL."),
  crypto("INJUSD", "INJ/USD", "BINANCE:INJUSDT", "INJUSDT", "Layer 1 & 2", 0.001, 0.001, 4,
    "Injective. 1 lot = 1 INJ."),
  crypto("SUIUSD", "SUI/USD", "BINANCE:SUIUSDT", "SUIUSDT", "Layer 1 & 2", 0.001, 0.001, 4,
    "Sui. 1 lot = 1 SUI."),

  // ============================================================
  // CRYPTO — DEFI & OTHERS (8)
  // ============================================================
  crypto("LINKUSD", "LINK/USD", "BINANCE:LINKUSDT", "LINKUSDT", "DeFi & Oracles", 0.01, 0.01, 3,
    "Chainlink. 1 lot = 1 LINK."),
  crypto("UNIUSD", "UNI/USD", "BINANCE:UNIUSDT", "UNIUSDT", "DeFi & Oracles", 0.01, 0.01, 3,
    "Uniswap. 1 lot = 1 UNI."),
  crypto("AAVEUSD", "AAVE/USD", "BINANCE:AAVEUSDT", "AAVEUSDT", "DeFi & Oracles", 0.01, 0.01, 2,
    "Aave. 1 lot = 1 AAVE."),
  crypto("MKRUSD", "MKR/USD", "BINANCE:MKRUSDT", "MKRUSDT", "DeFi & Oracles", 0.01, 0.01, 2,
    "Maker. 1 lot = 1 MKR."),
  crypto("RUNEUSD", "RUNE/USD", "BINANCE:RUNEUSDT", "RUNEUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "THORChain. 1 lot = 1 RUNE."),
  crypto("TIAUSD", "TIA/USD", "BINANCE:TIAUSDT", "TIAUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "Celestia. 1 lot = 1 TIA."),
  crypto("SEIUSD", "SEI/USD", "BINANCE:SEIUSDT", "SEIUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "Sei. 1 lot = 1 SEI."),
  crypto("BNBUSD", "BNB/USD", "BINANCE:BNBUSDT", "BNBUSDT", "DeFi & Oracles", 0.01, 0.01, 2,
    "BNB. 1 lot = 1 BNB."),
];

export function symbolsByClass(assetClass: AssetClass): SymbolSpec[] {
  return SYMBOLS.filter((s) => s.assetClass === assetClass);
}

export function getSymbol(id: string): SymbolSpec {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[0];
}

// Group symbols in an asset class by their `category` field.
// Returns ordered categories with their symbols.
export function groupedSymbolsByClass(
  assetClass: AssetClass
): { category: string; symbols: SymbolSpec[] }[] {
  const all = symbolsByClass(assetClass);
  const seen = new Set<string>();
  const out: { category: string; symbols: SymbolSpec[] }[] = [];
  for (const s of all) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      out.push({
        category: s.category,
        symbols: all.filter((x) => x.category === s.category),
      });
    }
  }
  return out;
}
