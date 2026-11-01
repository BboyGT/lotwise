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
  synth("BOOM50", "Boom 50", "DERIV:BOOM_50", "BOOM50", "Boom & Crash", 0.2,
    "Deriv synthetic index with frequent upward spikes."),
  synth("BOOM150", "Boom 150", "DERIV:BOOM_150", "BOOM150N", "Boom & Crash", 0.2,
    "Deriv synthetic index with frequent upward spikes."),
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
  synth("CRASH50", "Crash 50", "DERIV:CRASH_50", "CRASH50", "Boom & Crash", 0.2,
    "Deriv synthetic index with frequent downward spikes."),
  synth("CRASH150", "Crash 150", "DERIV:CRASH_150", "CRASH150N", "Boom & Crash", 0.2,
    "Deriv synthetic index with frequent downward spikes."),
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
  // SYNTHETIC — STEP INDICES (Deriv's currently active range)
  // ============================================================
  synth("STEP100", "Step Index 100", "DERIV:STEP_100", "stpRNG", "Step Indices", 0.1,
    "Deriv Step Index 100."),
  synth("STEP200", "Step Index 200", "DERIV:STEP_200", "stpRNG2", "Step Indices", 0.1,
    "Deriv Step Index 200."),
  synth("STEP300", "Step Index 300", "DERIV:STEP_300", "stpRNG3", "Step Indices", 0.1,
    "Deriv Step Index 300."),
  synth("STEP400", "Step Index 400", "DERIV:STEP_400", "stpRNG4", "Step Indices", 0.1,
    "Deriv Step Index 400."),
  synth("STEP500", "Step Index 500", "DERIV:STEP_500", "stpRNG5", "Step Indices", 0.1,
    "Deriv Step Index 500."),

  // ============================================================
  // SYNTHETIC — BULL, BEAR, Z & SMART INDICES
  // ============================================================
  synth("BULLMARKET", "Bull Market Index", "DERIV:RD_BULL", "RDBULL", "Bull/Bear/Smart", 0.01,
    "Deriv. Simulates bullish market behaviour."),
  synth("BEARMARKET", "Bear Market Index", "DERIV:RD_BEAR", "RDBEAR", "Bull/Bear/Smart", 0.01,
    "Deriv. Simulates bearish market behaviour."),
  synth("RANGEBREAK100", "Range Break 100 Index", "DERIV:RB_100", "RB100", "Range Break", 0.01,
    "Deriv Range Break 100 synthetic index."),
  synth("RANGEBREAK200", "Range Break 200 Index", "DERIV:RB_200", "RB200", "Range Break", 0.01,
    "Deriv Range Break 200 synthetic index."),
  synth("BASKETAUD", "AUD Basket", "DERIV:WLD_AUD", "WLDAUD", "Baskets", 0.01,
    "Deriv synthetic basket tracking the Australian dollar."),
  synth("BASKETEUR", "EUR Basket", "DERIV:WLD_EUR", "WLDEUR", "Baskets", 0.01,
    "Deriv synthetic basket tracking the euro."),
  synth("BASKETGBP", "GBP Basket", "DERIV:WLD_GBP", "WLDGBP", "Baskets", 0.01,
    "Deriv synthetic basket tracking the British pound."),
  synth("BASKETUSD", "USD Basket", "DERIV:WLD_USD", "WLDUSD", "Baskets", 0.01,
    "Deriv synthetic basket tracking the US dollar."),
  synth("BASKETXAU", "Gold Basket", "DERIV:WLD_XAU", "WLDXAU", "Baskets", 0.01,
    "Deriv synthetic basket tracking gold."),

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
  crypto("DYDXUSD", "DYDX/USD", "BINANCE:DYDXUSDT", "DYDXUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "dYdX. 1 lot = 1 DYDX."),
  crypto("CRVUSD", "CRV/USD", "BINANCE:CRVUSDT", "CRVUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "Curve DAO. 1 lot = 1 CRV."),
  crypto("SUSHIUSD", "SUSHI/USD", "BINANCE:SUSHIUSDT", "SUSHIUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "SushiSwap. 1 lot = 1 SUSHI."),
  crypto("YFIUSD", "YFI/USD", "BINANCE:YFIUSDT", "YFIUSDT", "DeFi & Oracles", 0.01, 0.01, 2,
    "Yearn Finance. 1 lot = 1 YFI."),
  crypto("COMPUSD", "COMP/USD", "BINANCE:COMPUSDT", "COMPUSDT", "DeFi & Oracles", 0.01, 0.01, 2,
    "Compound. 1 lot = 1 COMP."),
  crypto("SNXUSD", "SNX/USD", "BINANCE:SNXUSDT", "SNXUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "Synthetix. 1 lot = 1 SNX."),
  crypto("1INCHUSD", "1INCH/USD", "BINANCE:1INCHUSDT", "1INCHUSDT", "DeFi & Oracles", 0.001, 0.001, 4,
    "1inch. 1 lot = 1 1INCH."),

  // ============================================================
  // CRYPTO — LAYER 1 ADDITIONAL (8)
  // ============================================================
  crypto("TRXUSD", "TRX/USD", "BINANCE:TRXUSDT", "TRXUSDT", "Layer 1 Additional", 0.0001, 0.0001, 4,
    "TRON. 1 lot = 1 TRX."),
  crypto("ETCUSDT", "ETC/USD", "BINANCE:ETCUSDT", "ETCUSDT", "Layer 1 Additional", 0.01, 0.01, 2,
    "Ethereum Classic. 1 lot = 1 ETC."),
  crypto("XLMUSD", "XLM/USD", "BINANCE:XLMUSDT", "XLMUSDT", "Layer 1 Additional", 0.0001, 0.0001, 4,
    "Stellar. 1 lot = 1 XLM."),
  crypto("VETUSD", "VET/USD", "BINANCE:VETUSDT", "VETUSDT", "Layer 1 Additional", 0.0001, 0.0001, 4,
    "VeChain. 1 lot = 1 VET."),
  crypto("ALGOUSD", "ALGO/USD", "BINANCE:ALGOUSDT", "ALGOUSDT", "Layer 1 Additional", 0.001, 0.001, 4,
    "Algorand. 1 lot = 1 ALGO."),
  crypto("ICPUSD", "ICP/USD", "BINANCE:ICPUSDT", "ICPUSDT", "Layer 1 Additional", 0.01, 0.01, 2,
    "Internet Computer. 1 lot = 1 ICP."),
  crypto("EGLDUSD", "EGLD/USD", "BINANCE:EGLDUSDT", "EGLDUSDT", "Layer 1 Additional", 0.01, 0.01, 2,
    "MultiversX. 1 lot = 1 EGLD."),
  crypto("STXUSD", "STX/USD", "BINANCE:STXUSDT", "STXUSDT", "Layer 1 Additional", 0.001, 0.001, 4,
    "Stacks. 1 lot = 1 STX."),

  // ============================================================
  // CRYPTO — GAMING & NFT (7)
  // ============================================================
  crypto("SANDUSD", "SAND/USD", "BINANCE:SANDUSDT", "SANDUSDT", "Gaming & NFT", 0.001, 0.001, 4,
    "The Sandbox. 1 lot = 1 SAND."),
  crypto("MANAUSD", "MANA/USD", "BINANCE:MANAUSDT", "MANAUSDT", "Gaming & NFT", 0.001, 0.001, 4,
    "Decentraland. 1 lot = 1 MANA."),
  crypto("AXSUSD", "AXS/USD", "BINANCE:AXSUSDT", "AXSUSDT", "Gaming & NFT", 0.01, 0.01, 2,
    "Axie Infinity. 1 lot = 1 AXS."),
  crypto("GALAUSD", "GALA/USD", "BINANCE:GALAUSDT", "GALAUSDT", "Gaming & NFT", 0.0001, 0.0001, 4,
    "Gala Games. 1 lot = 1 GALA."),
  crypto("THETAUSD", "THETA/USD", "BINANCE:THETAUSDT", "THETAUSDT", "Gaming & NFT", 0.001, 0.001, 4,
    "Theta Network. 1 lot = 1 THETA."),
  crypto("CHZUSD", "CHZ/USD", "BINANCE:CHZUSDT", "CHZUSDT", "Gaming & NFT", 0.0001, 0.0001, 4,
    "Chiliz. 1 lot = 1 CHZ."),
  crypto("ENJUSD", "ENJ/USD", "BINANCE:ENJUSDT", "ENJUSDT", "Gaming & NFT", 0.0001, 0.0001, 4,
    "Enjin Coin. 1 lot = 1 ENJ."),

  // ============================================================
  // CRYPTO — MEME COINS (5)
  // ============================================================
  crypto("DOGEUSD", "DOGE/USD", "BINANCE:DOGEUSDT", "DOGEUSDT", "Meme Coins", 0.0001, 0.0001, 5,
    "Dogecoin. 1 lot = 1 DOGE."),
  crypto("SHIBUSD", "SHIB/USD", "BINANCE:SHIBUSDT", "SHIBUSDT", "Meme Coins", 0.0000001, 0.0000001, 8,
    "Shiba Inu. 1 lot = 1 SHIB."),
  crypto("PEPEUSD", "PEPE/USD", "BINANCE:PEPEUSDT", "PEPEUSDT", "Meme Coins", 0.0000001, 0.0000001, 8,
    "Pepe. 1 lot = 1 PEPE."),
  crypto("BONKUSD", "BONK/USD", "BINANCE:BONKUSDT", "BONKUSDT", "Meme Coins", 0.0000001, 0.0000001, 8,
    "Bonk. 1 lot = 1 BONK."),
  crypto("WIFUSD", "WIF/USD", "BINANCE:WIFUSDT", "WIFUSDT", "Meme Coins", 0.0001, 0.0001, 4,
    "dogwifhat. 1 lot = 1 WIF."),

  // ============================================================
  // CRYPTO — AI & INFRASTRUCTURE (5)
  // ============================================================
  crypto("RNDRUSD", "RNDR/USD", "BINANCE:RNDRUSDT", "RNDRUSDT", "AI & Infrastructure", 0.01, 0.01, 2,
    "Render. 1 lot = 1 RNDR."),
  crypto("GRTUSD", "GRT/USD", "BINANCE:GRTUSDT", "GRTUSDT", "AI & Infrastructure", 0.001, 0.001, 4,
    "The Graph. 1 lot = 1 GRT."),
  crypto("LDOUSD", "LDO/USD", "BINANCE:LDOUSDT", "LDOUSDT", "AI & Infrastructure", 0.001, 0.001, 4,
    "Lido DAO. 1 lot = 1 LDO."),
  crypto("ORDIUSD", "ORDI/USD", "BINANCE:ORDIUSDT", "ORDIUSDT", "AI & Infrastructure", 0.001, 0.001, 4,
    "ORDI (BRC-20). 1 lot = 1 ORDI."),
  crypto("WLDUSD", "WLD/USD", "BINANCE:WLDUSDT", "WLDUSDT", "AI & Infrastructure", 0.001, 0.001, 4,
    "Worldcoin. 1 lot = 1 WLD."),

  // ============================================================
  // CRYPTO — ADDITIONAL (5)
  // ============================================================
  crypto("FTMUSD", "FTM/USD", "BINANCE:FTMUSDT", "FTMUSDT", "Additional", 0.001, 0.001, 4,
    "Fantom. 1 lot = 1 FTM."),
  crypto("ZILUSD", "ZIL/USD", "BINANCE:ZILUSDT", "ZILUSDT", "Additional", 0.0001, 0.0001, 4,
    "Zilliqa. 1 lot = 1 ZIL."),
  crypto("FLOWUSD", "FLOW/USD", "BINANCE:FLOWUSDT", "FLOWUSDT", "Additional", 0.001, 0.001, 4,
    "Flow. 1 lot = 1 FLOW."),
  crypto("IOTAUSD", "IOTA/USD", "BINANCE:IOTAUSDT", "IOTAUSDT", "Additional", 0.0001, 0.0001, 4,
    "IOTA. 1 lot = 1 IOTA."),
  crypto("JUPUSD", "JUP/USD", "BINANCE:JUPUSDT", "JUPUSDT", "Additional", 0.001, 0.001, 4,
    "Jupiter. 1 lot = 1 JUP."),
];

export function symbolsByClass(assetClass: AssetClass): SymbolSpec[] {
  return SYMBOLS.filter((s) => s.assetClass === assetClass);
}

const LEGACY_SYNTHETIC_SYMBOLS: Record<string, SymbolSpec> = Object.fromEntries(
  [
    ...Array.from({ length: 9 }, (_, index) => {
      const step = (index + 1) / 10;
      return [`STEP0${index + 1}`, `Step Index (${step.toFixed(1)})`];
    }),
    ["ZVOL75", "Z Volatility 75 Index"],
    ["SMART5R", "Smart 5R Index"],
    ["SMART10R", "Smart 10R Index"],
    ["SMART20R", "Smart 20R Index"],
    ["SMART40R", "Smart 40R Index"],
  ].map(([id, label]) => [id, {
    id,
    label,
    tvSymbol: "",
    assetClass: "synthetic",
    category: "Unavailable legacy symbol",
    minLot: 0.01,
    lotStep: 0.01,
    contractSize: 1,
    pipSize: 1,
    pipValuePerLot: 1,
    decimals: 2,
    note: "This symbol is no longer available from Deriv's public market data feed.",
  } satisfies SymbolSpec]),
);

export function getSymbol(id: string): SymbolSpec {
  return SYMBOLS.find((s) => s.id === id) ?? LEGACY_SYNTHETIC_SYMBOLS[id] ?? SYMBOLS[0];
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
