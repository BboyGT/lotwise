"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CLASSES,
  AssetClass,
  SYMBOLS,
  SymbolSpec,
  getSymbol,
  symbolsByClass,
  groupedSymbolsByClass,
} from "@/lib/symbols-v3";
import {
  calculateTrade,
  currencySymbol,
  formatLot,
  formatMoney,
  formatPrice,
  FX_RATES,
} from "@/lib/calculator";
import { useLivePrice } from "@/hooks/use-live-price-v3";
import { useAlarmManager } from "@/hooks/use-alarm-manager";
import { usePWA } from "@/hooks/use-pwa";
import { primeAudioContext } from "@/lib/sound-engine";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Target,
  Shield,
  Layers,
  CircleDot,
  Zap,
  Wifi,
  WifiOff,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  BellRing,
  Download,
} from "lucide-react";
import { TradingViewWidget, TradingViewTicker } from "@/components/tradingview-widget";
import { SearchableSymbolPicker } from "@/components/searchable-symbol-picker";
import { LotwiseLogo } from "@/components/lotwise-logo";
import { AlarmPanel } from "@/components/alarm-panel";
import { LegalModal } from "@/components/legal-modal";
import { EquityCurveChart } from "@/components/equity-curve-chart";
import { SyntheticCandleChart } from "@/components/synthetic-candle-chart";
import { ConnectionDiagnostic } from "@/components/connection-diagnostic";
import { AnimatedNumber } from "@/components/gt-mark";
import { resolveTradeOutcome } from "@/lib/trade-outcomes";

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "JPY"] as const;
type CurrencyCode = (typeof CURRENCIES)[number];

interface TradeRecord {
  id: string;
  timestamp: number;
  symbolId: string;
  symbolLabel: string;
  assetClass: AssetClass;
  balance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  recommendedLot: number;
  actualLoss: number;
  actualProfit: number;
  rrRatio: number;
  note?: string;              // user journal note
  outcome?: "win" | "loss" | "breakeven" | "pending";  // user-set outcome
  realizedPnL?: number;       // user-set realized P/L for equity curve
  closedAt?: number;
  exitPrice?: number;
}

const HISTORY_KEY = "lotwise.history.v1";
const LEGACY_HISTORY_KEYS = ["pipforge.history.v1", "riskmate.history.v1"];
const SETTINGS_KEY = "lotwise.settings.v1";
const LEGACY_SETTINGS_KEYS = ["pipforge.settings.v1", "riskmate.settings.v1"];

export default function Home() {
  // ----- settings -----
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");

  // ----- inputs -----
  const [assetClass, setAssetClass] = useState<AssetClass>("synthetic"); // start on synthetic to showcase live Deriv feed
  const [symbolId, setSymbolId] = useState<string>("VOL75");
  const [balance, setBalance] = useState<number>(100);
  const [riskPercent, setRiskPercent] = useState<number>(10);
  const [entry, setEntry] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");

  // ----- history -----
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(true);

  // ----- hydrated flag for localStorage load -----
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      // Migrate from legacy keys if new keys don't exist
      let saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) {
        for (const k of LEGACY_SETTINGS_KEYS) {
          saved = localStorage.getItem(k);
          if (saved) break;
        }
      }
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.displayCurrency) setDisplayCurrency(obj.displayCurrency);
        if (obj.balance) setBalance(obj.balance);
        if (obj.riskPercent) setRiskPercent(obj.riskPercent);
      }
      let hist = localStorage.getItem(HISTORY_KEY);
      if (!hist) {
        for (const k of LEGACY_HISTORY_KEYS) {
          hist = localStorage.getItem(k);
          if (hist) break;
        }
      }
      if (hist) setHistory(JSON.parse(hist));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ displayCurrency, balance, riskPercent })
    );
  }, [displayCurrency, balance, riskPercent, hydrated]);

  const symbol = useMemo(() => getSymbol(symbolId), [symbolId]);
  const symbolList = useMemo(() => symbolsByClass(assetClass), [assetClass]);
  const groupedSymbols = useMemo(
    () => groupedSymbolsByClass(assetClass),
    [assetClass]
  );

  function changeAssetClass(next: AssetClass) {
    const first = symbolsByClass(next)[0];
    setAssetClass(next);
    if (first) {
      setSymbolId(first.id);
      setEntry("");
      setStopLoss("");
      setTakeProfit("");
    }
  }

  // Live price source — Deriv WS for synthetics, Binance REST for crypto,
  // TradingView scanner for forex/indices. Memoized to ensure stable reference.
  const livePriceSource = useMemo(() => {
    if (!symbol.derivSymbol && !symbol.binanceSymbol && !symbol.tvScannerSymbol) {
      return null;
    }
    return {
      derivSymbol: symbol.derivSymbol,
      binanceSymbol: symbol.binanceSymbol,
      tvScannerSymbol: symbol.tvScannerSymbol,
      decimals: symbol.decimals,
    };
  }, [symbol.derivSymbol, symbol.binanceSymbol, symbol.tvScannerSymbol, symbol.decimals]);
  const livePrice = useLivePrice(livePriceSource);
  const hasLiveFeed = !!livePriceSource;
  // DerivTicks alias — maps livePrice fields to the names used throughout the JSX
  const derivTicks = {
    price: livePrice.price,
    prevPrice: livePrice.prevPrice,
    direction: livePrice.direction,
    isLoading: livePrice.isLoading,
    error: livePrice.error,
    connected: livePrice.connected,
    usingFallback: livePrice.source === "simulator" || livePrice.source === "none",
  };

  // ----- PWA install prompt -----
  const pwa = usePWA();

  // Stable values for SSR/first-render — empty/default until hydrated to
  // avoid hydration mismatches when localStorage loads saved inputs.
  // The server renders with defaults (100, 10, ""), and so does the first
  // client render. After hydration, actual saved values kick in.
  const stableEntry = hydrated ? entry : "";
  const stableStopLoss = hydrated ? stopLoss : "";
  const stableTakeProfit = hydrated ? takeProfit : "";
  const stableBalance = hydrated ? balance : 100;
  const stableRiskPercent = hydrated ? riskPercent : 10;
  const stableCurrency = hydrated ? displayCurrency : "USD" as CurrencyCode;

  const calc = useMemo(
    () =>
      calculateTrade({
        symbol,
        balance: stableBalance,
        riskPercent: stableRiskPercent,
        entry: parseFloat(stableEntry) || 0,
        stopLoss: parseFloat(stableStopLoss) || 0,
        takeProfit: parseFloat(stableTakeProfit) || 0,
      }),
    [symbol, stableBalance, stableRiskPercent, stableEntry, stableStopLoss, stableTakeProfit]
  );

  // ----- Alarm / Notification state -----
  const [alarmPanelOpen, setAlarmPanelOpen] = useState(false);
  // ----- Legal modal -----
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"tos" | "privacy" | "disclaimer">("tos");
  // ----- Journal note for save-trade flow -----
  const [tradeNote, setTradeNote] = useState("");
  const tradeLevelsForAlarm = useMemo(() => {
    if (!calc.valid) return null;
    return {
      symbolId: symbol.id,
      entry: parseFloat(stableEntry) || undefined,
      stopLoss: parseFloat(stableStopLoss) || undefined,
      takeProfit: parseFloat(stableTakeProfit) || undefined,
    };
  }, [calc.valid, symbol.id, stableEntry, stableStopLoss, stableTakeProfit]);

  // Unit label: forex = "pips", others = "points"
  const unitLabel = symbol.assetClass === "forex" ? "pips" : "points";

  const tickerSymbols = useMemo(
    () => [
      "FX:EURUSD",
      "FX:GBPUSD",
      "TVC:US30",
      "TVC:NAS100",
      "TVC:VIX",
      "BINANCE:BTCUSDT",
      "BINANCE:ETHUSDT",
    ],
    []
  );

  // Auto-fill entry from live Deriv tick on demand (button click)
  function useLivePriceAsEntry() {
    if (!hasLiveFeed || derivTicks.price == null) {
      // fallback: try TradingView widget — but TV doesn't expose prices
      // without their paid API. Show a hint instead.
      alert(
        "Live feed unavailable for this symbol. Look at the chart above and enter the price manually."
      );
      return;
    }
    setEntry(derivTicks.price!.toFixed(symbol.decimals));
  }

  // Quick-fill SL and TP based on entry + suggested distances
  function quickFillDistances() {
    const e = parseFloat(entry);
    if (!(e > 0)) {
      alert("Enter an entry price first.");
      return;
    }
    // Suggest 1% SL distance, 3% TP distance (1:3 R:R) as starting point
    const slDist = e * 0.01;
    const tpDist = e * 0.03;
    setStopLoss((e - slDist).toFixed(symbol.decimals));
    setTakeProfit((e + tpDist).toFixed(symbol.decimals));
  }

  function saveTrade() {
    if (!calc.valid) return;
    const record: TradeRecord = {
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      symbolId: symbol.id,
      symbolLabel: symbol.label,
      assetClass: symbol.assetClass,
      balance,
      riskPercent,
      entry: parseFloat(entry),
      stopLoss: parseFloat(stopLoss),
      takeProfit: parseFloat(takeProfit),
      recommendedLot: calc.recommendedLot,
      actualLoss: calc.actualLoss,
      actualProfit: calc.actualProfit,
      rrRatio: calc.rrRatio,
      note: tradeNote.trim() || undefined,
      outcome: "pending",
    };
    const next = [record, ...history].slice(0, 50);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setTradeNote("");

    // Sync trades to service worker for background monitoring
    syncTradesToSW(next);

    // Scroll to history section so user sees the saved trade
    setTimeout(() => {
      const historyCard = document.querySelector('[class*="HISTORY"]')?.closest('[data-slot="card"]') ||
                           document.querySelectorAll('[data-slot="card"]')[
                             document.querySelectorAll('[data-slot="card"]').length - 1
                           ];
      historyCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // Sync pending trades to the service worker for background monitoring
  function syncTradesToSW(trades: TradeRecord[]) {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Only sync pending trades that have SL/TP
    const pendingTrades = trades
      .filter((t) => (t.outcome === "pending" || !t.outcome) && t.stopLoss && t.takeProfit)
      .map((t) => ({
        id: t.id,
        symbolId: t.symbolId,
        symbolLabel: t.symbolLabel,
        binanceSymbol: getSymbol(t.symbolId).binanceSymbol,
        tvScannerSymbol: getSymbol(t.symbolId).tvScannerSymbol,
        derivSymbol: getSymbol(t.symbolId).derivSymbol,
        entry: t.entry,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        actualLoss: t.actualLoss,
        actualProfit: t.actualProfit,
        outcome: t.outcome || "pending",
      }));
    // Store globally for alarm panel to pick up
    (window as unknown as { __lotwiseTrades?: typeof pendingTrades }).__lotwiseTrades = pendingTrades;
    navigator.serviceWorker?.controller?.postMessage({
      type: "SYNC_TRADES",
      trades: pendingTrades,
    });
  }

  function updateTradeRecord(id: string, updates: Partial<TradeRecord>) {
    const next = history.map((r) => {
      if (r.id !== id) return r;
      const merged = { ...r, ...updates };
      if (updates.outcome === "pending") {
        merged.realizedPnL = undefined;
        merged.closedAt = undefined;
        merged.exitPrice = undefined;
      } else if (updates.outcome) {
        if (updates.realizedPnL === undefined) {
          merged.realizedPnL = updates.outcome === "win"
            ? r.actualProfit
            : updates.outcome === "loss" ? -r.actualLoss : 0;
        }
        merged.closedAt = updates.closedAt ?? Date.now();
      }
      return merged;
    });
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    syncTradesToSW(next);
  }

  // Auto-journal target/stop crossings while this symbol has a real live feed.
  useEffect(() => {
    if (!livePrice.connected || !livePrice.price || livePrice.source === "simulator" || livePrice.source === "none") return;
    const closedAt = Date.now();
    const next = history.map((trade) => {
      if (trade.symbolId !== symbol.id || (trade.outcome && trade.outcome !== "pending")) return trade;
      const resolved = resolveTradeOutcome(trade, livePrice.price!);
      return resolved ? { ...trade, ...resolved, closedAt } : trade;
    });
    if (next.some((trade, index) => trade !== history[index])) {
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      syncTradesToSW(next);
    }
  }, [history, livePrice.connected, livePrice.price, livePrice.source, symbol.id]);

  function deleteTrade(id: string) {
    const next = history.filter((r) => r.id !== id);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    syncTradesToSW(next);
  }

  // Listen for background outcomes from the service worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "TRADE_OUTCOME") {
        updateTradeRecord(data.tradeId, {
          outcome: data.outcome,
          ...(Number.isFinite(data.realizedPnL) ? { realizedPnL: data.realizedPnL } : {}),
          ...(Number.isFinite(data.price) ? { exitPrice: data.price } : {}),
          ...(Number.isFinite(data.timestamp) ? { closedAt: data.timestamp } : {}),
        });
      } else if (data.type === "PENDING_OUTCOMES") {
        if (data.outcomes && Array.isArray(data.outcomes)) {
          for (const oc of data.outcomes) {
            updateTradeRecord(oc.tradeId, {
              outcome: oc.outcome,
              ...(Number.isFinite(oc.realizedPnL) ? { realizedPnL: oc.realizedPnL } : {}),
              ...(Number.isFinite(oc.price) ? { exitPrice: oc.price } : {}),
              ...(Number.isFinite(oc.timestamp) ? { closedAt: oc.timestamp } : {}),
            });
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    navigator.serviceWorker?.controller?.postMessage({ type: "GET_PENDING_OUTCOMES" });

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [history]);

  function replayTrade(rec: TradeRecord) {
    setAssetClass(rec.assetClass);
    setSymbolId(rec.symbolId);
    setBalance(rec.balance);
    setRiskPercent(rec.riskPercent);
    setEntry(String(rec.entry));
    setStopLoss(String(rec.stopLoss));
    setTakeProfit(String(rec.takeProfit));
    setHistoryOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    syncTradesToSW([]);
  }

  // ----- R:R bar geometry -----
  // The bar runs from SL to TP. Entry sits between them.
  // We compute percentages of the full SL→TP distance.
  const rrBar = useMemo(() => {
    if (!calc.valid) return null;
    const sl = parseFloat(stableStopLoss);
    const tp = parseFloat(stableTakeProfit);
    const e = parseFloat(stableEntry);
    const min = Math.min(sl, tp);
    const max = Math.max(sl, tp);
    const range = max - min || 1;
    const entryPct = ((e - min) / range) * 100;
    const slPct = ((sl - min) / range) * 100;
    const tpPct = ((tp - min) / range) * 100;
    return { entryPct, slPct, tpPct, isLong: sl < e };
  }, [calc.valid, stableStopLoss, stableTakeProfit, stableEntry]);

  // Display the converted amount (USD → display currency)
  function conv(amountUsd: number): number {
    return amountUsd / FX_RATES.USD * (FX_RATES[stableCurrency] ?? 1);
  }

  // Format live tick price for display
  function fmtLivePrice(p: number | null): string {
    if (p == null) return "—";
    return p.toFixed(symbol.decimals);
  }

  return (
    <div className="rm-grid-bg rm-scanlines min-h-screen flex flex-col text-slate-100">
      {/* ===== Top Ticker ===== */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <TradingViewTicker symbols={tickerSymbols} />
      </div>

      {/* ===== Header ===== */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <LotwiseLogo
              size={36}
              className="drop-shadow-[0_0_8px_rgba(255,184,0,0.4)] shrink-0 w-8 h-8 sm:w-9 sm:h-9"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-none">
                Lot<span className="text-amber-400">wise</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-mono mt-0.5 hidden sm:block">
                Position Terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* PWA install button */}
            {pwa.canInstall && !pwa.isInstalled && (
              <button
                onClick={() => pwa.promptInstall()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors"
                title="Install app"
                aria-label="Install app"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">
                  Install
                </span>
              </button>
            )}

            {/* Alarm bell button */}
            <button
              onClick={() => {
                primeAudioContext();
                setAlarmPanelOpen(true);
              }}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              title="Alarms & notifications"
              aria-label="Alarms & notifications"
            >
              <BellRing className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline text-slate-300">
                Alerts
              </span>
            </button>

            {/* System status — compact on mobile */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
              <span
                className={`rm-pulse-dot ${
                  hasLiveFeed
                    ? derivTicks.connected
                      ? derivTicks.usingFallback
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                      : "bg-amber-400"
                    : "bg-cyan-400"
                }`}
                style={{ width: 6, height: 6 }}
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {hasLiveFeed
                  ? derivTicks.connected
                    ? derivTicks.usingFallback
                      ? livePrice.source === "binance-rest"
                        ? "Binance · Live"
                        : livePrice.source === "tv-scanner"
                        ? "TV · Live"
                        : "Deriv WS · SIM"
                      : livePrice.source === "binance-rest"
                      ? "Binance · Live"
                      : livePrice.source === "tv-scanner"
                      ? "TV · Live"
                      : "Deriv WS · Live"
                    : "Connecting…"
                  : "TV Chart Mode"}
              </span>
              {hasLiveFeed ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-slate-500" />
              )}
            </div>
            <Select
              value={stableCurrency}
              onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}
            >
              <SelectTrigger
                className="w-[88px] h-8 bg-white/5 border-white/10 font-mono text-xs shrink-0"
                suppressHydrationWarning
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencySymbol(c)} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Asset class tabs */}
        <Tabs
          value={assetClass}
          onValueChange={(v) => changeAssetClass(v as AssetClass)}
        >
          <TabsList className="grid grid-cols-4 w-full bg-black/40 border border-white/5 h-auto p-1">
            {ASSET_CLASSES.map((ac) => (
              <TabsTrigger
                key={ac.id}
                value={ac.id}
                className="py-2 sm:py-2.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-amber-500/20 border border-transparent font-mono text-[10px] sm:text-xs uppercase tracking-wider"
              >
                {ac.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Top row: Symbol picker + Live price */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CircleDot className="h-3 w-3 text-amber-400" />
                Symbol
              </CardTitle>
              <CardDescription className="text-[10px] font-mono uppercase tracking-wider text-slate-600 mt-1" suppressHydrationWarning>
                Type to search · {symbolList.length} pairs
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <SearchableSymbolPicker
                assetClass={assetClass}
                value={symbolId}
                onChange={setSymbolId}
              />
              {symbol.note && (
                <p className="text-[10px] text-slate-500 font-mono mt-2 leading-relaxed">
                  {symbol.note}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Live price card */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="rm-pulse-dot bg-cyan-400" style={{ width: 6, height: 6 }} />
                  Live Price
                </span>
                <span className="text-[9px] text-slate-600 font-mono">
                  {hasLiveFeed
                    ? livePrice.source === "deriv-ws"
                      ? "DERIV · WS"
                      : livePrice.source === "binance-rest"
                      ? "BINANCE · REST"
                      : livePrice.source === "tv-scanner"
                      ? "TV · SCANNER"
                      : livePrice.source === "simulator"
                      ? symbol.derivSymbol
                        ? "DERIV · SIM"
                        : "BINANCE · SIM"
                      : "TRADINGVIEW"
                    : "TRADINGVIEW"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {hasLiveFeed ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-3">
                    <span
                      className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight ${
                        derivTicks.direction === "up"
                          ? "text-emerald-400 rm-flash-up"
                          : derivTicks.direction === "down"
                          ? "text-rose-400 rm-flash-down"
                          : "text-white"
                      }`}
                    >
                      {fmtLivePrice(derivTicks.price)}
                    </span>
                    {derivTicks.direction && (
                      <span
                        className={`flex items-center gap-0.5 text-sm font-mono mb-1 ${
                          derivTicks.direction === "up"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {derivTicks.direction === "up" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <span>Source: <span className="text-slate-300">{symbol.derivSymbol || symbol.binanceSymbol || symbol.tvScannerSymbol || "—"}</span></span>
                    <span>·</span>
                    <span>
                      {livePrice.source === "simulator"
                        ? "Simulated (WS unreachable in sandbox)"
                        : livePrice.source === "binance-rest"
                        ? "Live · Binance REST"
                        : livePrice.source === "tv-scanner"
                        ? "Live · TradingView Scanner"
                        : livePrice.source === "deriv-ws"
                        ? "Live · Deriv WS"
                        : derivTicks.isLoading
                        ? "Subscribing…"
                        : derivTicks.error
                        ? "Error"
                        : "Streaming"}
                    </span>
                  </div>
                  {derivTicks.error && (
                    <p className="text-[10px] text-rose-400 font-mono">
                      ⚠ {derivTicks.error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-mono text-slate-500">—</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    No live feed — refer to chart below
                  </p>
                </div>
              )}
              {/* Connection diagnostic — especially useful for synthetic (Deriv WS) */}
              {hasLiveFeed && symbol.derivSymbol && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <ConnectionDiagnostic />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live chart — TradingView for forex/indices/crypto, candlestick chart for synthetic */}
        <Card className="overflow-hidden rm-glass border-white/5">
          <CardContent className="p-0">
            {symbol.assetClass === "synthetic" && symbol.derivSymbol ? (
              <SyntheticCandleChart
                derivSymbol={symbol.derivSymbol}
                symbolLabel={symbol.label}
                decimals={symbol.decimals}
                height={320}
              />
            ) : (
              <TradingViewWidget
                symbol={symbol.tvSymbol}
                height={280}
                type="mini"
              />
            )}
          </CardContent>
        </Card>

        {/* Inputs row */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Account & Risk */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Shield className="h-3 w-3 text-amber-400" />
                Account · Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Balance input with steppers + presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Balance (USD)
                  </Label>
                  <span className="text-[10px] font-mono text-slate-600">
                    ≈ {formatMoney(conv(stableBalance), stableCurrency)}
                  </span>
                </div>
                <div className="flex items-stretch gap-1">
                  {/* Minus stepper */}
                  <button
                    type="button"
                    onClick={() => setBalance((b) => Math.max(0, b - 10))}
                    className="rm-stepper shrink-0 w-9 rounded-md border border-white/10 bg-black/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 font-mono text-base flex items-center justify-center transition-colors"
                    aria-label="Decrease balance by 10"
                  >
                    −
                  </button>
                  {/* Main input with $ prefix */}
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-sm pointer-events-none">$</span>
                    <Input
                      type="number"
                      value={stableBalance}
                      min={0}
                      step={10}
                      onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                      className="pl-7 bg-black/40 border-white/10 text-white font-mono tabular-nums text-lg focus-visible:border-amber-500/40 focus-visible:ring-amber-500/20 h-10"
                    />
                  </div>
                  {/* Plus stepper */}
                  <button
                    type="button"
                    onClick={() => setBalance((b) => b + 10)}
                    className="rm-stepper shrink-0 w-9 rounded-md border border-white/10 bg-black/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 font-mono text-base flex items-center justify-center transition-colors"
                    aria-label="Increase balance by 10"
                  >
                    +
                  </button>
                </div>
                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: "50", value: 50 },
                    { label: "100", value: 100 },
                    { label: "500", value: 500 },
                    { label: "1K", value: 1000 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setBalance(preset.value)}
                      className={`h-6 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                        stableBalance === preset.value
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-black/40 text-slate-500 border border-white/5 hover:bg-white/5 hover:text-slate-300"
                      }`}
                    >
                      ${preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk per trade slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Risk per trade
                  </Label>
                  <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
                    {stableRiskPercent}%
                  </span>
                </div>
                <Slider
                  value={[stableRiskPercent]}
                  min={0.5}
                  max={100}
                  step={0.5}
                  onValueChange={(v) => setRiskPercent(v[0])}
                />
                {/* Tick labels under slider */}
                <div className="flex justify-between text-[9px] font-mono text-slate-600 -mt-1">
                  <span>0.5%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                {/* Fine input + presets */}
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={stableRiskPercent}
                    min={0}
                    max={100}
                    step={0.5}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setRiskPercent(Math.min(100, Math.max(0, v)));
                    }}
                    className="bg-black/40 border-white/10 text-white font-mono tabular-nums text-sm focus-visible:border-amber-500/40 h-8 w-20"
                  />
                  {[
                    { label: "1%", value: 1 },
                    { label: "2%", value: 2 },
                    { label: "5%", value: 5 },
                    { label: "10%", value: 10 },
                    { label: "25%", value: 25 },
                    { label: "50%", value: 50 },
                    { label: "100%", value: 100 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setRiskPercent(preset.value)}
                      className={`flex-1 h-8 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                        stableRiskPercent === preset.value
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-black/40 text-slate-500 border border-white/5 hover:bg-white/5 hover:text-slate-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {stableRiskPercent > 20 && (
                  <p className="text-[10px] font-mono text-rose-400/80 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                    <span className="rm-pulse-dot bg-rose-400" style={{ width: 5, height: 5 }} />
                    High risk — {stableRiskPercent}% of balance at stake
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-white/5 mt-2 pt-2">
                  <span className="text-slate-500 uppercase tracking-wider">At risk:</span>
                  <span className="font-semibold text-rose-400 tabular-nums text-sm">
                    {formatMoney(conv((stableBalance * stableRiskPercent) / 100), stableCurrency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Setup */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Target className="h-3 w-3 text-cyan-400" />
                Trade Setup
              </CardTitle>
              <CardDescription className="text-[10px] font-mono uppercase tracking-wider text-slate-600">
                LONG if SL &lt; entry · SHORT if SL &gt; entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Entry
                  </Label>
                  {hasLiveFeed && derivTicks.price != null && (
                    <button
                      onClick={useLivePriceAsEntry}
                      className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                    >
                      ↳ Use live
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stableEntry}
                  step="any"
                  onChange={(e) => setEntry(e.target.value)}
                  className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-amber-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-rose-400/70">
                    Stop Loss
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stableStopLoss}
                    step="any"
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-rose-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70">
                    Take Profit
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stableTakeProfit}
                    step="any"
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-emerald-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useLivePriceAsEntry}
                  disabled={!hasLiveFeed || derivTicks.price == null}
                  className="flex-1 bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:text-emerald-300 font-mono text-[10px] uppercase tracking-wider"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Fill Live Entry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickFillDistances}
                  className="flex-1 bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:text-cyan-300 font-mono text-[10px] uppercase tracking-wider"
                >
                  Quick 1:3
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============== RESULT HERO ============== */}
        <Card className="rm-glass-gold overflow-hidden">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-mono uppercase tracking-[0.2em] text-amber-400/80 flex items-center gap-2">
              <Layers className="h-3 w-3" />
              Calculation Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!calc.valid ? (
              <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-200">
                <AlertTitle className="text-amber-300 font-mono uppercase tracking-wider text-xs">
                  Awaiting Trade Setup
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-xs font-mono text-slate-400">
                    Fill in Entry, Stop Loss, and Take Profit to calculate your
                    position size, risk, and reward. The journal note + save
                    button appear here once the calc is valid.
                  </p>
                  {calc.errors.length > 0 && (
                    <ul className="list-disc ml-4 text-xs font-mono space-y-0.5 text-slate-400">
                      {calc.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Big lot size hero */}
                <div className="text-center py-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400/70 font-mono mb-2">
                    Recommended Lot Size
                  </p>
                  <p className="text-6xl sm:text-7xl lg:text-8xl font-bold text-amber-400 rm-glow-gold font-mono tabular-nums leading-none">
                    <AnimatedNumber value={calc.recommendedLot} duration={500} format={(n) => n.toFixed(2)} />
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <span>exact: <span className="text-slate-300">{calc.exactLot.toFixed(4)}</span></span>
                    <span className="text-slate-700">·</span>
                    <span>step: <span className="text-slate-300">{symbol.lotStep}</span></span>
                    <span className="text-slate-700">·</span>
                    <span>min: <span className="text-slate-300">{symbol.minLot}</span></span>
                  </div>
                  <div className="mt-3">
                    {calc.minLotOk ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
                        <span className="rm-pulse-dot bg-emerald-400" style={{ width: 6, height: 6 }} />
                        Within broker min
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono uppercase tracking-wider">
                        <span className="rm-pulse-dot bg-rose-400" style={{ width: 6, height: 6 }} />
                        Below broker min ({symbol.minLot})
                      </span>
                    )}
                  </div>
                </div>

                {/* R:R visual bar */}
                {rrBar && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      <span>Risk : Reward Visualization</span>
                      <span className="text-amber-400">1 : {calc.rrRatio.toFixed(2)}</span>
                    </div>
                    <div className="rm-rr-bar">
                      {/* SL zone (left half) — red */}
                      <div
                        className="rm-rr-bar-segment"
                        style={{
                          left: 0,
                          width: `${rrBar.isLong ? rrBar.entryPct : 100 - rrBar.entryPct}%`,
                          background:
                            "linear-gradient(90deg, rgba(255, 59, 92, 0.45), rgba(255, 59, 92, 0.15))",
                        }}
                      >
                        <span className="text-rose-200">SL</span>
                      </div>
                      {/* TP zone (right half) — green */}
                      <div
                        className="rm-rr-bar-segment"
                        style={{
                          right: 0,
                          width: `${rrBar.isLong ? 100 - rrBar.entryPct : rrBar.entryPct}%`,
                          background:
                            "linear-gradient(90deg, rgba(16, 224, 161, 0.15), rgba(16, 224, 161, 0.45))",
                        }}
                      >
                        <span className="text-emerald-200">TP</span>
                      </div>
                      {/* Entry marker */}
                      <div
                        className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                        style={{
                          left: `${rrBar.entryPct}%`,
                          transform: "translateX(-50%)",
                          width: 2,
                          background: "rgba(255, 184, 0, 0.9)",
                          boxShadow: "0 0 8px rgba(255, 184, 0, 0.6)",
                        }}
                      >
                        <div
                          className="absolute -top-1 w-2 h-2 rounded-full bg-amber-400"
                          style={{ boxShadow: "0 0 6px rgba(255, 184, 0, 0.8)" }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>SL @ <span className="text-rose-300">{formatPrice(parseFloat(stableStopLoss), symbol.decimals)}</span></span>
                      <span className="text-amber-400">ENTRY @ <span className="text-amber-300">{formatPrice(parseFloat(stableEntry), symbol.decimals)}</span></span>
                      <span>TP @ <span className="text-emerald-300">{formatPrice(parseFloat(stableTakeProfit), symbol.decimals)}</span></span>
                    </div>
                  </div>
                )}

                {/* 4-stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatTile
                    label="Risk $"
                    value={<AnimatedNumber value={conv(calc.riskAmount)} duration={400} format={(n) => formatMoney(n, displayCurrency)} />}
                    color="amber"
                    icon={<Shield className="h-3 w-3" />}
                  />
                  <StatTile
                    label="Loss"
                    value={<AnimatedNumber value={conv(calc.actualLoss)} duration={400} format={(n) => formatMoney(n, displayCurrency)} />}
                    color="rose"
                    icon={<TrendingDown className="h-3 w-3" />}
                  />
                  <StatTile
                    label="Win"
                    value={<AnimatedNumber value={conv(calc.actualProfit)} duration={400} format={(n) => formatMoney(n, displayCurrency)} />}
                    color="emerald"
                    icon={<TrendingUp className="h-3 w-3" />}
                  />
                  <StatTile
                    label="R : R"
                    value={`1:${calc.rrRatio.toFixed(2)}`}
                    color="cyan"
                    icon={<Target className="h-3 w-3" />}
                  />
                </div>

                {/* Detailed breakdown */}
                <div className="rounded-md border border-white/5 bg-black/40 p-3 grid grid-cols-2 gap-y-2 text-xs font-mono">
                  <div className="flex justify-between pr-3">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">SL dist</span>
                    <span className="text-rose-300 tabular-nums">
                      {formatPrice(calc.slDistance, symbol.decimals)} <span className="text-slate-600">({calc.slPips.toFixed(1)} {unitLabel})</span>
                    </span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-white/5">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">TP dist</span>
                    <span className="text-emerald-300 tabular-nums">
                      {formatPrice(calc.tpDistance, symbol.decimals)} <span className="text-slate-600">({calc.tpPips.toFixed(1)} {unitLabel})</span>
                    </span>
                  </div>
                  <div className="flex justify-between pr-3">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">Direction</span>
                    <span className={calc.minLotOk ? "text-cyan-300" : "text-rose-300"}>
                      {stableStopLoss && stableEntry && parseFloat(stableStopLoss) < parseFloat(stableEntry) ? "▲ LONG" : "▼ SHORT"}
                    </span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-white/5">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">Acct risk</span>
                    <span className="text-amber-300 tabular-nums">
                      {stableRiskPercent}% of {formatMoney(stableBalance, "USD")}
                    </span>
                  </div>
                </div>

                {/* Min lot warning */}
                {calc.minLotWarning && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.06] overflow-hidden">
                    {/* Header bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20">
                      <span className="rm-pulse-dot bg-rose-400" style={{ width: 6, height: 6 }} />
                      <span className="text-xs font-mono uppercase tracking-wider text-rose-300 font-semibold">
                        Below Broker Minimum Lot
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Explanation */}
                      <p className="text-xs font-mono text-slate-300 leading-relaxed">
                        Calculated lot <span className="text-rose-300 font-bold">{formatLot(calc.recommendedLot)}</span>
                        {" "}is below broker minimum of{" "}
                        <span className="text-amber-300 font-bold">{calc.minLotWarning.minLot}</span>{" "}
                        for {symbol.label}.
                      </p>

                      {/* Divider */}
                      <div className="border-t border-white/5" />

                      {/* Sub-header */}
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        If you trade the minimum lot:
                      </p>

                      {/* Vertical metric list — each on its own row to prevent overlap */}
                      <div className="space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] shrink-0">
                            Loss at min lot
                          </span>
                          <span className="text-rose-300 font-bold tabular-nums text-right">
                            {formatMoney(conv(calc.minLotWarning.lossAtMinLot), displayCurrency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] shrink-0">
                            Win at min lot
                          </span>
                          <span className="text-emerald-300 font-bold tabular-nums text-right">
                            {formatMoney(conv(calc.minLotWarning.profitAtMinLot), displayCurrency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] shrink-0">
                            Excess risk
                          </span>
                          <span className="text-right">
                            <span className="text-rose-300 font-bold tabular-nums block">
                              {formatMoney(conv(calc.minLotWarning.excessRisk), displayCurrency)}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              (+{calc.minLotWarning.excessRiskPercent.toFixed(2)}% over budget)
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/5" />

                      {/* Options */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          Adjust to fit broker minimum:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-black/40 border border-white/5 text-slate-300">
                            <span className="text-amber-400">→</span> Widen SL distance
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-black/40 border border-white/5 text-slate-300">
                            <span className="text-amber-400">→</span> Increase balance
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-black/40 border border-white/5 text-slate-300">
                            <span className="text-amber-400">→</span> Accept higher risk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Journal note input */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Journal note (optional)
                  </Label>
                  <textarea
                    value={tradeNote}
                    onChange={(e) => setTradeNote(e.target.value)}
                    placeholder="e.g. breakout from consolidation, trend continuation, news event, setup quality…"
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-md bg-black/40 border border-white/10 text-white font-mono text-xs p-2.5 resize-none focus:outline-none focus:border-amber-500/40 placeholder:text-slate-600"
                  />
                  <p className="text-[9px] font-mono text-slate-600 text-right">
                    {tradeNote.length}/300
                  </p>
                </div>

                {/* Save */}
                <Button
                  onClick={() => {
                    saveTrade();
                    // Brief visual feedback
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) {
                      const orig = btn.textContent;
                      btn.textContent = "✓ SAVED TO HISTORY";
                      btn.classList.add("bg-emerald-500");
                      setTimeout(() => {
                        btn.textContent = orig;
                        btn.classList.remove("bg-emerald-500");
                      }, 1500);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono uppercase tracking-wider text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  <History className="h-3 w-3 mr-1.5" />
                  Save to History
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="rm-glass border-white/5">
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CardHeader className="pb-2 pt-3">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between hover:opacity-80 transition">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <History className="h-3 w-3" />
                    History
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-400 text-[10px] font-mono ml-1"
                    >
                      {history.length}
                    </Badge>
                  </CardTitle>
                  {historyOpen ? (
                    <ChevronUp className="h-3 w-3 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {history.length === 0 ? (
                  <div className="space-y-3 py-4">
                    <p className="text-xs font-mono text-slate-600 text-center uppercase tracking-wider">
                      No saved trades yet
                    </p>
                    <p className="text-[10px] font-mono text-slate-700 text-center leading-relaxed">
                      Fill in Entry, Stop Loss, and Take Profit above.<br/>
                      Add an optional journal note, then click<br/>
                      <span className="text-amber-500">Save to History</span> to track trades<br/>
                      and see your equity curve here.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Equity Curve */}
                    <div className="rounded-md border border-white/5 bg-black/40 p-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                        Equity Curve · starting {formatMoney(stableBalance, stableCurrency)}
                      </p>
                      <EquityCurveChart
                        trades={history}
                        startingBalance={stableBalance}
                        displayCurrency={stableCurrency}
                      />
                    </div>

                    {/* Trade list with journal + outcome controls */}
                    <div className="space-y-2 max-h-96 overflow-y-auto rm-scroll pr-1">
                      {history.map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-md border border-white/5 bg-black/40 p-2.5 hover:bg-white/5 transition font-mono text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-white truncate">
                                {rec.symbolLabel}
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0"
                              >
                                {formatLot(rec.recommendedLot)} lot
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => replayTrade(rec)}
                                className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-amber-300 transition-colors"
                              >
                                Replay
                              </button>
                              <button
                                onClick={() => deleteTrade(rec.id)}
                                className="text-[10px] font-mono p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                aria-label="Delete trade"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-600 mb-0.5">
                            {new Date(rec.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 mb-2 flex gap-3 flex-wrap">
                            <span>R:R 1:{rec.rrRatio.toFixed(2)}</span>
                            <span className="text-rose-300">L: {formatMoney(rec.actualLoss, "USD")}</span>
                            <span className="text-emerald-300">W: {formatMoney(rec.actualProfit, "USD")}</span>
                          </div>

                          {/* Outcome selector */}
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mr-1">
                              Outcome:
                            </span>
                            {(["pending", "win", "loss", "breakeven"] as const).map((o) => (
                              <button
                                key={o}
                                onClick={() => updateTradeRecord(rec.id, { outcome: o })}
                                className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                                  (rec.outcome || "pending") === o
                                    ? o === "win"
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : o === "loss"
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                      : o === "breakeven"
                                      ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-black/40 text-slate-500 border-white/5 hover:bg-white/5"
                                }`}
                              >
                                {o === "win" ? "W" : o === "loss" ? "L" : o === "breakeven" ? "BE" : "?"}
                              </button>
                            ))}
                            {rec.outcome && rec.outcome !== "pending" && (
                              <span className="ml-auto text-[9px] font-mono text-slate-600">
                                {rec.realizedPnL != null
                                  ? `${rec.realizedPnL > 0 ? "+" : ""}${formatMoney(rec.realizedPnL, "USD")}`
                                  : rec.outcome === "win"
                                  ? `+${formatMoney(rec.actualProfit, "USD")}`
                                  : rec.outcome === "loss"
                                  ? `-${formatMoney(rec.actualLoss, "USD")}`
                                  : "±0"}
                              </span>
                            )}
                          </div>

                          {rec.exitPrice != null && rec.closedAt != null && (
                            <div className="mb-2 text-[9px] font-mono text-slate-500">
                              Closed at {formatPrice(rec.exitPrice, getSymbol(rec.symbolId).decimals)} · {new Date(rec.closedAt).toLocaleString()}
                            </div>
                          )}

                          {/* Note (existing or add) */}
                          {rec.note ? (
                            <div className="rounded bg-amber-500/[0.06] border border-amber-500/15 p-1.5 text-[10px] font-mono text-amber-200/90 italic">
                              "{rec.note}"
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="Add note…"
                              maxLength={200}
                              className="w-full bg-black/30 border border-white/5 rounded px-2 py-1 text-[10px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/30"
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v) updateTradeRecord(rec.id, { note: v });
                                e.target.value = "";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearHistory}
                        className="w-full text-rose-300 hover:text-rose-200 hover:bg-rose-500/5 font-mono text-[10px] uppercase tracking-wider mt-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 bg-black/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-wider text-slate-600">
            <span className="flex items-center gap-2">
              <LotwiseLogo size={18} className="shrink-0 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              LOTWISE · POSITION TERMINAL
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { setLegalTab("tos"); setLegalModalOpen(true); }}
                className="text-slate-500 hover:text-amber-300 transition-colors"
              >
                Terms
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => { setLegalTab("privacy"); setLegalModalOpen(true); }}
                className="text-slate-500 hover:text-amber-300 transition-colors"
              >
                Privacy
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => { setLegalTab("disclaimer"); setLegalModalOpen(true); }}
                className="text-slate-500 hover:text-amber-300 transition-colors"
              >
                Disclaimer
              </button>
              <span className="text-slate-700">·</span>
              <span className="text-amber-500/70">FOR EDUCATIONAL USE</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== Legal Modal ===== */}
      <LegalModal
        open={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />

      {/* ===== Alarm Panel ===== */}
      <AlarmPanel
        open={alarmPanelOpen}
        onClose={() => setAlarmPanelOpen(false)}
        currentSymbolId={symbol.id}
        currentSymbolLabel={symbol.label}
        currentSymbolAssetClass={symbol.assetClass}
        currentPrice={livePrice.price}
        currentSymbolDecimals={symbol.decimals}
        tradeLevels={tradeLevelsForAlarm}
        currentDerivSymbol={symbol.derivSymbol}
      />
    </div>
  );
}

// ----- Stat tile component -----
function StatTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  color: "amber" | "rose" | "emerald" | "cyan";
  icon?: React.ReactNode;
}) {
  const colors: Record<string, { border: string; bg: string; text: string }> = {
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      text: "text-amber-300",
    },
    rose: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/5",
      text: "text-rose-300",
    },
    emerald: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      text: "text-emerald-300",
    },
    cyan: {
      border: "border-cyan-500/20",
      bg: "bg-cyan-500/5",
      text: "text-cyan-300",
    },
  };
  const c = colors[color];
  return (
    <div className={`rounded-md border ${c.border} ${c.bg} p-2.5`}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider opacity-70 font-mono">
        {icon}
        {label}
      </div>
      <p className={`text-lg font-bold tabular-nums mt-1 font-mono ${c.text}`}>
        {value}
      </p>
    </div>
  );
}
